use std::{
    fs,
    path::Path,
    process::{Command, Stdio},
    time::{Duration, Instant},
};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{
        diagnose, install, nginx, node, postgres,
        types::{unix_timestamp_string, PortableRuntimeConfig, ProcessInfo, ProcessRegistry},
        PortableJob,
    },
    scripts,
};

pub fn start(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<ProcessRegistry> {
    diagnose::validate_installation()?;
    let config = install::read_or_create_runtime_config()?;
    nginx::write_config(&config)?;
    ctx.check_cancelled()?;
    let postgres_pid = postgres::ensure_ready(ctx, &config)?;
    if let Err(error) = ctx.check_cancelled() {
        let _ = postgres::stop_best_effort();
        return Err(error);
    }

    let next_pid = start_next(ctx, &config)?;
    if let Err(error) = ctx.check_cancelled() {
        let _ = kill_pid_if_owned(next_pid, &paths::mg_pocket_app_dir()?);
        let _ = postgres::stop_best_effort();
        return Err(error);
    }
    let nginx_pid = start_nginx(ctx, &config)?;
    if let Err(error) = ctx.check_cancelled() {
        stop_nginx_best_effort();
        let _ = kill_pid_if_owned(next_pid, &paths::mg_pocket_app_dir()?);
        let _ = postgres::stop_best_effort();
        return Err(error);
    }
    let registry = ProcessRegistry {
        runtime_mode: "portable".to_string(),
        nginx: Some(ProcessInfo {
            pid: nginx_pid,
            port: config.public_port,
        }),
        next: Some(ProcessInfo {
            pid: next_pid,
            port: config.next_port,
        }),
        postgres: Some(ProcessInfo {
            pid: postgres_pid,
            port: config.postgres_port,
        }),
        started_at: unix_timestamp_string(),
    };
    ctx.progress("Sistema", "Registrando processos portáteis.", 84);
    write_registry(&registry)?;
    Ok(registry)
}

pub fn stop(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let registry = read_registry().unwrap_or_else(ProcessRegistry::empty);
    stop_nginx(ctx)?;
    if let Some(next) = registry.next {
        kill_pid_if_owned(next.pid, &paths::mg_pocket_app_dir()?)?;
    }
    postgres::stop(ctx)?;
    write_registry(&ProcessRegistry::empty())
}

pub fn restart(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<ProcessRegistry> {
    let _ = stop(ctx);
    start(ctx)
}

pub fn read_registry() -> Option<ProcessRegistry> {
    let path = paths::mg_pocket_config_dir().ok()?.join("processes.json");
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

fn write_registry(registry: &ProcessRegistry) -> LauncherResult<()> {
    let config_dir = paths::mg_pocket_config_dir()?;
    fs::create_dir_all(&config_dir).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta de configuração", error)
    })?;
    fs::write(
        config_dir.join("processes.json"),
        serde_json::to_string_pretty(registry).unwrap_or_else(|_| "{}".to_string()),
    )
    .map_err(|error| LauncherError::technical("Não foi possível gravar processes.json", error))
}

fn start_next(
    ctx: &mut PortableJob<'_, '_>,
    config: &PortableRuntimeConfig,
) -> LauncherResult<u32> {
    let log = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(paths::mg_pocket_logs_dir()?.join("app.log"))
        .map_err(|error| LauncherError::technical("Não foi possível abrir app.log", error))?;
    let err = log
        .try_clone()
        .map_err(|error| LauncherError::technical("Não foi possível abrir app.log", error))?;
    let mut command = node::next_command(config)?;
    command.stdout(Stdio::from(log)).stderr(Stdio::from(err));
    ctx.progress("Sistema", "Iniciando aplicativo local.", 66);
    command
        .spawn()
        .map(|child| child.id())
        .map_err(|error| LauncherError::technical("Não foi possível iniciar Next portátil", error))
}

fn start_nginx(
    ctx: &mut PortableJob<'_, '_>,
    config: &PortableRuntimeConfig,
) -> LauncherResult<u32> {
    ctx.progress("Sistema", "Validando configuração do Nginx portátil.", 76);
    nginx::test_config()?;
    let mut command = nginx::start_command()?;
    scripts::prepare_child_command(&mut command);
    nginx::append_launcher_log(&format!(
        "\n=== nginx start {} ===\ncomando: {command:?}\n",
        unix_timestamp_string()
    ))?;
    let stdout = nginx::open_launcher_log()?;
    let stderr = stdout.try_clone().map_err(|error| {
        LauncherError::technical("Não foi possível abrir nginx-launcher.log", error)
    })?;
    command
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr));
    ctx.progress("Sistema", "Iniciando acesso local.", 78);
    let mut child = command.spawn().map_err(|error| {
        nginx::nginx_error_with_logs(
            "Não foi possível iniciar o Nginx portátil.",
            format!("Falha ao executar nginx.exe: {error}"),
        )
    })?;
    let pid = child.id();
    let started = Instant::now();
    while started.elapsed() < Duration::from_secs(10) {
        if let Err(error) = ctx.check_cancelled() {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }

        if diagnose::check_http_path(config.public_port, "/healthz", Duration::from_millis(500)) {
            return Ok(pid);
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                return Err(nginx::nginx_error_with_logs(
                    "O Nginx portátil encerrou antes de responder.",
                    format!(
                        "nginx.exe encerrou antes de /healthz responder. Exit code: {}",
                        status
                            .code()
                            .map(|code| code.to_string())
                            .unwrap_or_else(|| "indisponível".to_string())
                    ),
                ));
            }
            Ok(None) => {}
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(nginx::nginx_error_with_logs(
                    "Não foi possível acompanhar o Nginx portátil.",
                    format!("Falha acompanhando processo nginx.exe: {error}"),
                ));
            }
        }

        std::thread::sleep(Duration::from_millis(250));
    }

    let _ = child.kill();
    let _ = child.wait();
    Err(nginx::nginx_error_with_logs(
        "O Nginx portátil não respondeu a tempo.",
        format!(
            "Timeout de 10s aguardando http://127.0.0.1:{}/healthz após iniciar nginx.exe.",
            config.public_port
        ),
    ))
}

fn stop_nginx(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let nginx = paths::mg_pocket_runtime_dir()?.join("nginx/nginx.exe");
    if !nginx.is_file() {
        return Ok(());
    }
    let mut command = Command::new(nginx);
    command.arg("-s").arg("quit");
    command
        .arg("-c")
        .arg(paths::mg_pocket_config_dir()?.join("nginx.conf"));
    command
        .arg("-p")
        .arg(paths::mg_pocket_runtime_dir()?.join("nginx"));
    super::run_command(
        ctx,
        "Parando serviços",
        "Parando Nginx portátil.",
        45,
        &mut command,
        Duration::from_secs(5),
    )
    .map(|_| ())
}

fn stop_nginx_best_effort() {
    let Ok(runtime_dir) = paths::mg_pocket_runtime_dir() else {
        return;
    };
    let Ok(config_dir) = paths::mg_pocket_config_dir() else {
        return;
    };
    let nginx = runtime_dir.join("nginx/nginx.exe");
    if !nginx.is_file() {
        return;
    }
    let mut command = Command::new(nginx);
    scripts::prepare_child_command(&mut command);
    command
        .arg("-s")
        .arg("quit")
        .arg("-c")
        .arg(config_dir.join("nginx.conf"))
        .arg("-p")
        .arg(runtime_dir.join("nginx"))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let _ = command_success_with_timeout(&mut command, Duration::from_secs(5));
}

fn command_success_with_timeout(command: &mut Command, timeout: Duration) -> bool {
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(_) => return false,
    };
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return status.success(),
            Ok(None) => {}
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return false;
            }
        }
        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return false;
        }
        std::thread::sleep(Duration::from_millis(80));
    }
}

fn kill_pid_if_owned(pid: u32, expected_path: &Path) -> LauncherResult<()> {
    if pid == 0
        || !pid_command_line(pid)
            .map(|line| line.contains(&expected_path.to_string_lossy().to_string()))
            .unwrap_or(false)
    {
        return Ok(());
    }

    if cfg!(target_os = "windows") {
        let mut command = Command::new("taskkill");
        scripts::prepare_child_command(&mut command);
        let _ = command
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .status();
    } else {
        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status();
    }
    Ok(())
}

fn pid_command_line(pid: u32) -> Option<String> {
    if cfg!(target_os = "windows") {
        let mut command = Command::new("powershell.exe");
        scripts::prepare_child_command(&mut command);
        let output = command
            .args([
                "-NoProfile",
                "-Command",
                &format!("(Get-CimInstance Win32_Process -Filter \"ProcessId={pid}\").CommandLine"),
            ])
            .output()
            .ok()?;
        return String::from_utf8(output.stdout).ok();
    }
    fs::read(format!("/proc/{pid}/cmdline"))
        .ok()
        .map(|bytes| String::from_utf8_lossy(&bytes).replace('\0', " "))
}
