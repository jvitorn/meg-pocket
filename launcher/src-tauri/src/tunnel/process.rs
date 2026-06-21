use std::{
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::mpsc,
    thread,
    time::{Duration, Instant},
};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths, scripts,
    tunnel::{
        download, state,
        types::{InstalledCloudflared, TunnelState},
        validation,
    },
};

const URL_WAIT_TIMEOUT: Duration = Duration::from_secs(45);

pub fn start(local_url: String) -> LauncherResult<TunnelState> {
    let local_url = validation::normalize_local_url(&local_url)?;
    if !validation::local_url_is_online(&local_url, Duration::from_secs(2)) {
        return Err(LauncherError::friendly(
            "Inicie o servidor local antes de criar o compartilhamento temporário.",
        ));
    }

    if let Some(active) = active_owned_state() {
        return Ok(active);
    }
    let _ = stop_active();

    let binary = download::ensure_cloudflared()?;
    let mut command = Command::new(&binary.path);
    scripts::prepare_child_command(&mut command);
    command
        .arg("tunnel")
        .arg("--no-autoupdate")
        .arg("--url")
        .arg(&local_url)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|error| {
        LauncherError::technical(
            "Não foi possível iniciar compartilhamento temporário",
            error,
        )
    })?;
    let pid = child.id();
    let preparing_state = TunnelState::preparing(local_url.clone(), pid, &binary);
    state::write_state(&preparing_state)?;

    let (tx, rx) = mpsc::channel::<String>();
    if let Some(stdout) = child.stdout.take() {
        spawn_output_reader(stdout, "stdout", tx.clone());
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_output_reader(stderr, "stderr", tx.clone());
    }

    let started = Instant::now();
    while started.elapsed() < URL_WAIT_TIMEOUT {
        if let Ok(line) = rx.recv_timeout(Duration::from_millis(200)) {
            if let Some(public_url) = validation::extract_trycloudflare_url(&line) {
                let active = preparing_state.clone().active(public_url);
                state::write_state(&active)?;
                return Ok(active);
            }
        }

        if let Some(status) = child.try_wait().map_err(|error| {
            LauncherError::technical(
                "Não foi possível acompanhar compartilhamento temporário",
                error,
            )
        })? {
            let _ = state::clear_state();
            return Err(LauncherError::new(
                "Não foi possível criar o link temporário.",
                format!("cloudflared encerrou antes de publicar URL. Exit status: {status}"),
            ));
        }
    }

    let _ = terminate_pid(pid, false);
    let _ = wait_until_dead(pid, Duration::from_secs(3));
    let _ = terminate_pid(pid, true);
    let _ = state::clear_state();
    Err(LauncherError::timeout(
        "Não foi possível criar o link temporário.",
        "Tempo esgotado aguardando URL trycloudflare.com.",
    ))
}

pub fn stop_active() -> LauncherResult<()> {
    let Some(current) = state::read_state() else {
        return Ok(());
    };
    if !validation::state_has_required_ownership_fields(&current) {
        let _ = state::clear_state();
        return Ok(());
    }

    let pid = current.pid.unwrap_or_default();
    if pid > 0 && process_matches_state(pid, &current) {
        terminate_pid(pid, false)?;
        if !wait_until_dead(pid, Duration::from_secs(5)) {
            terminate_pid(pid, true)?;
            let _ = wait_until_dead(pid, Duration::from_secs(5));
        }
    }
    state::clear_state()
}

pub fn cleanup_stale_state() {
    let Some(current) = state::read_state() else {
        return;
    };
    if current.status == "active" || current.status == "preparing" || current.pid.is_some() {
        let _ = stop_active();
        let _ = state::clear_state();
    }
}

pub fn current_state() -> TunnelState {
    if let Some(active) = active_owned_state() {
        return active;
    }
    if let Some(current) = state::read_state() {
        if current.status == "active" || current.status == "preparing" {
            let _ = state::clear_state();
        }
    }
    TunnelState::inactive()
}

pub fn log_text() -> String {
    let path = paths::mg_pocket_logs_dir()
        .ok()
        .map(|dir| dir.join("cloudflared.log"));
    let Some(path) = path else {
        return String::new();
    };
    fs::read_to_string(path).unwrap_or_default()
}

fn active_owned_state() -> Option<TunnelState> {
    let current = state::read_state()?;
    if current.status != "active" {
        return None;
    }
    let pid = current.pid?;
    if process_matches_state(pid, &current) {
        Some(current)
    } else {
        let _ = state::clear_state();
        None
    }
}

fn spawn_output_reader<R>(reader: R, level: &'static str, tx: mpsc::Sender<String>)
where
    R: std::io::Read + Send + 'static,
{
    thread::spawn(move || {
        let mut log = open_tunnel_log().ok();
        let reader = BufReader::new(reader);
        for line in reader.lines() {
            let Ok(line) = line else {
                break;
            };
            if let Some(log) = log.as_mut() {
                let _ = writeln!(log, "[cloudflared][{level}] {line}");
            }
            let _ = tx.send(line);
        }
    });
}

fn open_tunnel_log() -> LauncherResult<fs::File> {
    let logs_dir = paths::mg_pocket_logs_dir()?;
    fs::create_dir_all(&logs_dir)
        .map_err(|error| LauncherError::technical("Não foi possível criar pasta de logs", error))?;
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(logs_dir.join("cloudflared.log"))
        .map_err(|error| {
            LauncherError::technical("Não foi possível abrir log do compartilhamento", error)
        })
}

fn process_matches_state(pid: u32, expected: &TunnelState) -> bool {
    let Some(snapshot) = process_snapshot(pid) else {
        return false;
    };
    let expected_exe = expected.executable_path.as_deref().unwrap_or_default();
    let expected_local_url = expected.local_url.as_deref().unwrap_or_default();
    if expected_exe.is_empty() || expected_local_url.is_empty() {
        return false;
    }

    let command_line_matches = snapshot.command_line.contains("cloudflared")
        && snapshot.command_line.contains("tunnel")
        && snapshot.command_line.contains(expected_local_url);
    let executable_matches = snapshot
        .executable_path
        .as_deref()
        .map(|path| path_matches(path, Path::new(expected_exe)))
        .unwrap_or_else(|| snapshot.command_line.contains(expected_exe));

    command_line_matches && executable_matches
}

fn path_matches(actual: &Path, expected: &Path) -> bool {
    let actual = actual
        .canonicalize()
        .unwrap_or_else(|_| actual.to_path_buf());
    let expected = expected
        .canonicalize()
        .unwrap_or_else(|_| expected.to_path_buf());
    actual == expected
}

struct ProcessSnapshot {
    executable_path: Option<PathBuf>,
    command_line: String,
}

fn process_snapshot(pid: u32) -> Option<ProcessSnapshot> {
    #[cfg(target_os = "windows")]
    {
        #[derive(serde::Deserialize)]
        #[serde(rename_all = "PascalCase")]
        struct WinProcess {
            executable_path: Option<String>,
            command_line: Option<String>,
        }

        let mut command = Command::new("powershell.exe");
        scripts::prepare_child_command(&mut command);
        let output = command
            .args([
                "-NoProfile",
                "-Command",
                &format!(
                    "Get-CimInstance Win32_Process -Filter \"ProcessId={pid}\" | Select-Object ExecutablePath,CommandLine | ConvertTo-Json -Compress"
                ),
            ])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8(output.stdout).ok()?;
        let process = serde_json::from_str::<WinProcess>(text.trim()).ok()?;
        return Some(ProcessSnapshot {
            executable_path: process.executable_path.map(PathBuf::from),
            command_line: process.command_line.unwrap_or_default(),
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        let command_line = fs::read(format!("/proc/{pid}/cmdline"))
            .ok()
            .map(|bytes| String::from_utf8_lossy(&bytes).replace('\0', " "))?;
        let executable_path = fs::read_link(format!("/proc/{pid}/exe")).ok();
        Some(ProcessSnapshot {
            executable_path,
            command_line,
        })
    }
}

fn terminate_pid(pid: u32, force: bool) -> LauncherResult<()> {
    if pid == 0 {
        return Ok(());
    }
    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("taskkill");
        scripts::prepare_child_command(&mut command);
        command.args(["/PID", &pid.to_string(), "/T"]);
        if force {
            command.arg("/F");
        }
        let _ = command.status();
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        let signal = if force { "-KILL" } else { "-TERM" };
        let _ = Command::new("kill")
            .args([signal, &pid.to_string()])
            .status();
        Ok(())
    }
}

fn wait_until_dead(pid: u32, timeout: Duration) -> bool {
    let started = Instant::now();
    while started.elapsed() < timeout {
        if process_snapshot(pid).is_none() {
            return true;
        }
        thread::sleep(Duration::from_millis(120));
    }
    process_snapshot(pid).is_none()
}

#[allow(dead_code)]
fn _binary_marker(_binary: &InstalledCloudflared) {}
