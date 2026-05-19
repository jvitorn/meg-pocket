mod errors;
mod installers;
mod jobs;
mod native;
mod paths;
mod scripts;

use std::process::Command;

use errors::{LauncherError, LauncherResult};
use jobs::JobManager;
use scripts::CommandOutput;
use tauri::{AppHandle, State};

fn command_result<T>(result: LauncherResult<T>) -> Result<T, String> {
    result.map_err(|error| error.friendly_message().to_string())
}

fn run_script_command(
    app: &AppHandle,
    jobs: &JobManager,
    script_name: &str,
    action: &str,
    args: &[&str],
) -> Result<CommandOutput, String> {
    command_result(scripts::run_or_error(app, jobs, script_name, action, args))
}

const SUDO_DOCKER_ENV: [(&str, &str); 1] = [("MG_POCKET_DOCKER_USE_SUDO", "1")];

fn run_script_command_with_docker_mode(
    app: &AppHandle,
    jobs: &JobManager,
    script_name: &str,
    action: &str,
    args: &[&str],
    use_sudo_docker: bool,
) -> Result<CommandOutput, String> {
    let empty_env: &[(&str, &str)] = &[];
    let extra_env = if use_sudo_docker {
        &SUDO_DOCKER_ENV[..]
    } else {
        empty_env
    };

    command_result(scripts::run_or_error_with_env(
        app,
        jobs,
        script_name,
        action,
        args,
        extra_env,
    ))
}

#[tauri::command]
fn doctor(app: AppHandle, jobs: State<'_, JobManager>) -> Result<String, String> {
    command_result(native::doctor(&app, &jobs))
}

#[tauri::command]
#[allow(non_snake_case)]
fn quickDiagnose() -> Result<String, String> {
    command_result(native::quick_diagnose())
}

#[tauri::command]
#[allow(non_snake_case)]
fn installDockerLinux(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        command_result(scripts::run_admin_or_error(
            &app,
            &jobs,
            "install-docker",
            "Instalar Docker",
            &[],
        ))
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        let _ = jobs;
        Err("Use o fluxo de dependências do Windows para instalar Docker Desktop via winget.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn checkSystemDependencies(app: AppHandle, jobs: State<'_, JobManager>) -> Result<String, String> {
    let _ = app;
    let _ = jobs;
    command_result(native::check_system_dependencies())
}

#[tauri::command]
#[allow(non_snake_case)]
fn installSystemDependencies(
    app: AppHandle,
    jobs: State<'_, JobManager>,
) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        command_result(scripts::run_admin_or_error(
            &app,
            &jobs,
            "install-system-dependencies",
            "Instalar dependências",
            &[],
        ))
    }

    #[cfg(target_os = "windows")]
    {
        run_script_command(
            &app,
            &jobs,
            "install-system-dependencies",
            "Instalar dependências",
            &[],
        )
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = app;
        let _ = jobs;
        Err("A instalação automática de dependências do sistema é suportada apenas no Linux e Windows.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn ensureDockerRunning(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    command_result(native::ensure_docker_running(&app, &jobs))
}

#[tauri::command]
#[allow(non_snake_case)]
fn ensureDockerPermission(
    app: AppHandle,
    jobs: State<'_, JobManager>,
) -> Result<CommandOutput, String> {
    command_result(native::ensure_docker_permission(&app, &jobs))
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn installProject(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(native::install_project(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn startApp(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(native::start_app(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn stopApp(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(native::stop_app(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn restartApp(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(native::restart_app(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn readLogs(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<String, String> {
    command_result(native::read_logs(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command]
#[allow(non_snake_case)]
fn cancelCurrentJob(jobs: State<'_, JobManager>) -> Result<bool, String> {
    command_result(native::cancel_current_job(&jobs))
}

#[tauri::command(rename_all = "camelCase")]
fn backup(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    run_script_command_with_docker_mode(
        &app,
        &jobs,
        "backup",
        "Backup",
        &[],
        use_sudo_docker.unwrap_or(false),
    )
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn restoreBackup(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    backupPath: String,
    confirmed: bool,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    if !confirmed {
        return Err("Restore exige confirmação explícita.".to_string());
    }

    run_script_command_with_docker_mode(
        &app,
        &jobs,
        "restore",
        "Restaurar backup",
        &[backupPath.as_str(), "--yes"],
        use_sudo_docker.unwrap_or(false),
    )
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn resetLocalData(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    confirmed: bool,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    if !confirmed {
        return Err("Reset local exige confirmação explícita.".to_string());
    }

    run_script_command_with_docker_mode(
        &app,
        &jobs,
        "reset",
        "Resetar dados locais",
        &["--yes"],
        use_sudo_docker.unwrap_or(false),
    )
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn removeLocalProject(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    mode: String,
    confirmed: bool,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    if !confirmed {
        return Err("Remoção local exige confirmação explícita.".to_string());
    }

    if mode != "safe" && mode != "complete" {
        return Err("Modo de remoção inválido.".to_string());
    }

    run_script_command_with_docker_mode(
        &app,
        &jobs,
        "remove-local-project",
        "Remover projeto local",
        &[mode.as_str()],
        use_sudo_docker.unwrap_or(false),
    )
}

fn open_allowed_url(url: &str) -> LauncherResult<()> {
    match url {
        "http://localhost:3000"
        | "http://localhost:8081"
        | "https://www.docker.com/products/docker-desktop/" => {}
        _ => return Err(LauncherError::friendly("URL não permitida pelo launcher.")),
    }

    #[cfg(target_os = "linux")]
    {
        for opener in ["xdg-open", "gio", "sensible-browser"] {
            let mut command = Command::new(opener);
            if opener == "gio" {
                command.arg("open");
            }
            scripts::sanitize_child_environment(&mut command);
            if command.arg(url).spawn().is_ok() {
                return Ok(());
            }
        }
        Err(LauncherError::friendly(
            "Não encontrei um abridor de URL no Linux.",
        ))
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()
            .map(|_| ())
            .map_err(|error| LauncherError::technical("Não foi possível abrir URL", error))
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|error| LauncherError::technical("Não foi possível abrir URL", error))
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err(LauncherError::friendly(
            "Sistema não suportado para abrir URL.",
        ))
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn openSite() -> Result<(), String> {
    command_result(open_allowed_url("http://localhost:3000"))
}

#[tauri::command]
#[allow(non_snake_case)]
fn openAdminer() -> Result<(), String> {
    command_result(open_allowed_url("http://localhost:8081"))
}

#[tauri::command]
#[allow(non_snake_case)]
fn openDockerGuide() -> Result<(), String> {
    command_result(open_allowed_url(
        "https://www.docker.com/products/docker-desktop/",
    ))
}

pub fn run() {
    tauri::Builder::default()
        .manage(JobManager::default())
        .invoke_handler(tauri::generate_handler![
            doctor,
            quickDiagnose,
            installDockerLinux,
            checkSystemDependencies,
            installSystemDependencies,
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
            resetLocalData,
            removeLocalProject,
            cancelCurrentJob
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar M&G Pocket Launcher");
}
