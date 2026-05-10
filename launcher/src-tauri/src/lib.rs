use serde::Serialize;
use std::{
    env,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandOutput {
    success: bool,
    code: Option<i32>,
    stdout: String,
    stderr: String,
}

fn command_error(context: &str, error: impl std::fmt::Display) -> String {
    format!("{context}: {error}")
}

fn installers_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    if let Ok(cwd) = env::current_dir() {
        candidates.push(cwd.join("installers"));
        candidates.push(cwd.join("../installers"));
        candidates.push(cwd.join("../../installers"));
        candidates.push(cwd.join("../../../installers"));
    }

    if let Ok(exe) = env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("installers"));
            candidates.push(parent.join("../installers"));
            candidates.push(parent.join("../../installers"));
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("installers"));
        candidates.push(resource_dir);
    }

    candidates
        .into_iter()
        .map(normalize_candidate)
        .find(|path| path.join("linux/doctor.sh").exists() || path.join("windows/doctor.ps1").exists())
        .ok_or_else(|| "Não encontrei a pasta installers embutida ou no repositório local.".to_string())
}

fn normalize_candidate(path: PathBuf) -> PathBuf {
    path.components().collect()
}

#[cfg(target_os = "windows")]
fn platform_script_path(app: &AppHandle, script_name: &str) -> Result<PathBuf, String> {
    Ok(installers_dir(app)?.join("windows").join(format!("{script_name}.ps1")))
}

#[cfg(target_os = "linux")]
fn platform_script_path(app: &AppHandle, script_name: &str) -> Result<PathBuf, String> {
    Ok(installers_dir(app)?.join("linux").join(format!("{script_name}.sh")))
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn platform_script_path(_app: &AppHandle, _script_name: &str) -> Result<PathBuf, String> {
    Err("Este launcher v1.1 oferece suporte operacional para Linux e Windows.".to_string())
}

#[cfg(target_os = "windows")]
fn build_script_command(script: &Path, args: &[&str]) -> Command {
    let mut command = Command::new("powershell.exe");
    command
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-File")
        .arg(script);
    command.args(args);
    command
}

#[cfg(not(target_os = "windows"))]
fn build_script_command(script: &Path, args: &[&str]) -> Command {
    let mut command = Command::new("bash");
    command.arg(script);
    command.args(args);
    command
}

fn run_platform_script(app: &AppHandle, script_name: &str, args: &[&str]) -> Result<CommandOutput, String> {
    let script = platform_script_path(app, script_name)?;
    if !script.exists() {
        return Err(format!("Script não encontrado: {}", script.display()));
    }

    let output = build_script_command(&script, args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|error| command_error("Não foi possível executar script", error))?;

    Ok(CommandOutput {
        success: output.status.success(),
        code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

fn run_or_error(app: &AppHandle, script_name: &str, args: &[&str]) -> Result<CommandOutput, String> {
    let output = run_platform_script(app, script_name, args)?;
    if output.success {
        Ok(output)
    } else {
        Err(format!(
            "{}\n{}",
            output.stderr.trim(),
            output.stdout.trim()
        )
        .trim()
        .to_string())
    }
}

#[tauri::command]
fn doctor(app: AppHandle) -> Result<String, String> {
    let output = run_or_error(&app, "doctor", &[])?;
    Ok(output.stdout)
}

#[tauri::command]
#[allow(non_snake_case)]
fn installDockerLinux(app: AppHandle) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        run_or_error(&app, "install-docker", &[])
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        Err("A instalação automática do Docker é suportada apenas no Linux. No Windows, instale o Docker Desktop manualmente.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn ensureDockerRunning(app: AppHandle) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        run_or_error(&app, "ensure-docker-running", &[])
    }

    #[cfg(target_os = "windows")]
    {
        run_or_error(&app, "doctor", &[])
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = app;
        Err("Sistema não suportado.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn ensureDockerPermission(app: AppHandle) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        run_or_error(&app, "ensure-docker-permission", &[])
    }

    #[cfg(target_os = "windows")]
    {
        run_or_error(&app, "doctor", &[])
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = app;
        Err("Sistema não suportado.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn installProject(app: AppHandle) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        run_or_error(&app, "install-project", &[])
    }

    #[cfg(target_os = "windows")]
    {
        run_or_error(&app, "install-project", &[])
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = app;
        Err("Sistema não suportado.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn startApp(app: AppHandle) -> Result<CommandOutput, String> {
    run_or_error(&app, "start", &[])
}

#[tauri::command]
#[allow(non_snake_case)]
fn stopApp(app: AppHandle) -> Result<CommandOutput, String> {
    run_or_error(&app, "stop", &[])
}

#[tauri::command]
#[allow(non_snake_case)]
fn restartApp(app: AppHandle) -> Result<CommandOutput, String> {
    run_or_error(&app, "restart", &[])
}

#[tauri::command]
#[allow(non_snake_case)]
fn readLogs(app: AppHandle) -> Result<String, String> {
    let output = run_or_error(&app, "logs", &[])?;
    Ok(output.stdout)
}

#[tauri::command]
fn backup(app: AppHandle) -> Result<CommandOutput, String> {
    run_or_error(&app, "backup", &[])
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn restoreBackup(app: AppHandle, backupPath: String, confirmed: bool) -> Result<CommandOutput, String> {
    if !confirmed {
        return Err("Restore exige confirmação explícita.".to_string());
    }
    run_or_error(&app, "restore", &[backupPath.as_str(), "--yes"])
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn resetLocalData(app: AppHandle, confirmed: bool) -> Result<CommandOutput, String> {
    if !confirmed {
        return Err("Reset local exige confirmação explícita.".to_string());
    }
    run_or_error(&app, "reset", &["--yes"])
}

fn open_allowed_url(url: &str) -> Result<(), String> {
    match url {
        "http://localhost:3000" | "http://localhost:8081" | "https://www.docker.com/products/docker-desktop/" => {}
        _ => return Err("URL não permitida pelo launcher.".to_string()),
    }

    #[cfg(target_os = "linux")]
    {
        for opener in ["xdg-open", "gio", "sensible-browser"] {
            let mut command = Command::new(opener);
            if opener == "gio" {
                command.arg("open");
            }
            if command.arg(url).spawn().is_ok() {
                return Ok(());
            }
        }
        Err("Não encontrei um abridor de URL no Linux.".to_string())
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()
            .map(|_| ())
            .map_err(|error| command_error("Não foi possível abrir URL", error))
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|error| command_error("Não foi possível abrir URL", error))
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("Sistema não suportado para abrir URL.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn openSite() -> Result<(), String> {
    open_allowed_url("http://localhost:3000")
}

#[tauri::command]
#[allow(non_snake_case)]
fn openAdminer() -> Result<(), String> {
    open_allowed_url("http://localhost:8081")
}

#[tauri::command]
#[allow(non_snake_case)]
fn openDockerGuide() -> Result<(), String> {
    open_allowed_url("https://www.docker.com/products/docker-desktop/")
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            doctor,
            installDockerLinux,
            ensureDockerRunning,
            ensureDockerPermission,
            installProject,
            startApp,
            stopApp,
            restartApp,
            openSite,
            openAdminer,
            openDockerGuide,
            readLogs,
            backup,
            restoreBackup,
            resetLocalData
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar M&G Pocket Launcher");
}
