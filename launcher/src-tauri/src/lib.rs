use serde::Serialize;
use std::{
    env,
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
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

fn is_installers_dir(path: &Path) -> bool {
    path.join("linux/doctor.sh").exists() || path.join("windows/doctor.ps1").exists()
}

fn normalize_candidate(path: PathBuf) -> PathBuf {
    path.components().collect()
}

fn dev_installers_dir() -> Option<PathBuf> {
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

    candidates
        .into_iter()
        .map(normalize_candidate)
        .find(|path| is_installers_dir(path))
}

fn launcher_data_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
            return Ok(PathBuf::from(local_app_data).join("mg-pocket-launcher"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(home) = env::var_os("HOME") {
            return Ok(PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("mg-pocket-launcher"));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Some(home) = env::var_os("HOME") {
            return Ok(PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("mg-pocket-launcher"));
        }
    }

    Err("Não consegui resolver a pasta local do launcher.".to_string())
}

fn bundled_installers_dir(app: &AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    let candidates = [
        resource_dir.join("installers"),
        resource_dir.join("../installers"),
        resource_dir.join("../../installers"),
        resource_dir,
    ];

    candidates
        .into_iter()
        .map(normalize_candidate)
        .find(|path| is_installers_dir(path))
}

fn copy_dir_all(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination)
        .map_err(|error| command_error("Não foi possível criar pasta local de installers", error))?;

    for entry in fs::read_dir(source)
        .map_err(|error| command_error("Não foi possível ler resources do launcher", error))?
    {
        let entry = entry.map_err(|error| command_error("Não foi possível ler item de resource", error))?;
        let file_type = entry
            .file_type()
            .map_err(|error| command_error("Não foi possível identificar item de resource", error))?;
        let target = destination.join(entry.file_name());

        if file_type.is_dir() {
            copy_dir_all(&entry.path(), &target)?;
        } else if file_type.is_file() {
            fs::copy(entry.path(), &target)
                .map_err(|error| command_error("Não foi possível copiar script do launcher", error))?;

            #[cfg(unix)]
            if target.extension().and_then(|extension| extension.to_str()) == Some("sh") {
                let mut permissions = fs::metadata(&target)
                    .map_err(|error| command_error("Não foi possível ler permissão do script", error))?
                    .permissions();
                permissions.set_mode(0o755);
                fs::set_permissions(&target, permissions)
                    .map_err(|error| command_error("Não foi possível aplicar permissão de execução", error))?;
            }
        }
    }

    Ok(())
}

fn local_installers_dir() -> Result<PathBuf, String> {
    Ok(launcher_data_dir()?.join("installers"))
}

fn prepare_bundled_installers(app: &AppHandle) -> Result<PathBuf, String> {
    let source = bundled_installers_dir(app)
        .ok_or_else(|| "Não encontrei a pasta installers embutida no bundle do launcher.".to_string())?;
    let destination = local_installers_dir()?;

    copy_dir_all(&source, &destination)?;

    if is_installers_dir(&destination) {
        Ok(destination)
    } else {
        Err("A cópia local dos installers ficou incompleta.".to_string())
    }
}

fn installers_dir(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(path) = dev_installers_dir() {
        return Ok(path);
    }

    if bundled_installers_dir(app).is_some() {
        return prepare_bundled_installers(app);
    }

    let local = local_installers_dir()?;
    if is_installers_dir(&local) {
        return Ok(local);
    }

    prepare_bundled_installers(app).map_err(|error| {
        format!(
            "{error}\nO launcher precisa dos scripts installers/ empacotados como resource."
        )
    })
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
