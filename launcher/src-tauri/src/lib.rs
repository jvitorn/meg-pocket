mod cleanup;
mod docker;
mod errors;
mod installers;
mod jobs;
mod paths;
mod portable;
mod process_utils;
mod runtime;
mod scripts;
mod storage;
mod tunnel;

use std::{
    path::Path,
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

use errors::{LauncherError, LauncherResult};
use jobs::JobManager;
use scripts::CommandOutput;
use tauri::{AppHandle, Manager, State, WindowEvent};

fn command_result<T>(result: LauncherResult<T>) -> Result<T, String> {
    result.map_err(|error| error.friendly_message().to_string())
}

#[tauri::command(async)]
fn doctor(app: AppHandle, jobs: State<'_, JobManager>) -> Result<String, String> {
    command_result(runtime::doctor(&app, &jobs))
}

#[tauri::command]
#[allow(non_snake_case)]
fn quickDiagnose() -> Result<String, String> {
    command_result(runtime::quick_diagnose())
}

#[tauri::command(async)]
#[allow(non_snake_case)]
fn installDockerLinux(
    app: AppHandle,
    jobs: State<'_, JobManager>,
) -> Result<CommandOutput, String> {
    command_result(docker::install_docker_linux(&app, &jobs))
}

#[tauri::command]
#[allow(non_snake_case)]
fn checkSystemDependencies(app: AppHandle, jobs: State<'_, JobManager>) -> Result<String, String> {
    let _ = app;
    let _ = jobs;
    command_result(runtime::check_system_dependencies())
}

#[tauri::command(async)]
#[allow(non_snake_case)]
fn installSystemDependencies(
    app: AppHandle,
    jobs: State<'_, JobManager>,
) -> Result<CommandOutput, String> {
    command_result(docker::install_system_dependencies(&app, &jobs))
}

#[tauri::command(async)]
#[allow(non_snake_case)]
fn ensureDockerRunning(
    app: AppHandle,
    jobs: State<'_, JobManager>,
) -> Result<CommandOutput, String> {
    command_result(docker::ensure_docker_running(&app, &jobs))
}

#[tauri::command(async)]
#[allow(non_snake_case)]
fn ensureDockerPermission(
    app: AppHandle,
    jobs: State<'_, JobManager>,
) -> Result<CommandOutput, String> {
    command_result(docker::ensure_docker_permission(&app, &jobs))
}

#[tauri::command(rename_all = "camelCase", async)]
#[allow(non_snake_case)]
fn installProject(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
    light_build: Option<bool>,
    local_build: Option<bool>,
    no_cache: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(runtime::install_project(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
        light_build.unwrap_or(false),
        local_build.unwrap_or(false),
        no_cache.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
#[allow(non_snake_case)]
fn repairInstallation(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
    light_build: Option<bool>,
    local_build: Option<bool>,
    no_cache: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(runtime::repair_installation(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
        light_build.unwrap_or(false),
        local_build.unwrap_or(false),
        no_cache.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
#[allow(non_snake_case)]
fn startApp(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(runtime::start_app(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
#[allow(non_snake_case)]
fn stopApp(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(runtime::stop_app(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
#[allow(non_snake_case)]
fn restartApp(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(runtime::restart_app(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
#[allow(non_snake_case)]
fn readLogs(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<String, String> {
    command_result(runtime::read_logs(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command]
#[allow(non_snake_case)]
fn cancelCurrentJob(jobs: State<'_, JobManager>) -> Result<bool, String> {
    command_result(runtime::cancel_current_job(&jobs))
}

#[tauri::command(rename_all = "camelCase", async)]
fn backup(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    command_result(runtime::backup(
        &app,
        &jobs,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
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

    command_result(runtime::restore_backup(
        &app,
        &jobs,
        backupPath,
        confirmed,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
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

    command_result(runtime::reset_local_data(
        &app,
        &jobs,
        confirmed,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
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

    let _ = tunnel::stop();
    command_result(docker::remove_local_project(
        &app,
        &jobs,
        mode,
        confirmed,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(rename_all = "camelCase", async)]
#[allow(non_snake_case)]
fn deleteLocalInstallation(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    confirmed: bool,
    use_sudo_docker: Option<bool>,
) -> Result<CommandOutput, String> {
    if !confirmed {
        return Err("Exclusão exige confirmação explícita.".to_string());
    }
    command_result(runtime::delete_local_installation(
        &app,
        &jobs,
        confirmed,
        use_sudo_docker.unwrap_or(false),
    ))
}

#[tauri::command(async)]
#[allow(non_snake_case)]
fn getShareStatus() -> Result<tunnel::TunnelState, String> {
    Ok(tunnel::status())
}

#[tauri::command(async)]
#[allow(non_snake_case)]
fn startShare() -> Result<tunnel::TunnelState, String> {
    command_result(tunnel::start(runtime::local_site_url()))
}

#[tauri::command(async)]
#[allow(non_snake_case)]
fn stopShare() -> Result<tunnel::TunnelState, String> {
    command_result(tunnel::stop())
}

#[tauri::command]
#[allow(non_snake_case)]
fn getLocalStorageStatus() -> Result<storage::LocalStorageStatus, String> {
    command_result(storage::local_storage_status())
}

fn open_allowed_url(url: &str) -> LauncherResult<()> {
    if url != "https://www.docker.com/products/docker-desktop/"
        && !is_allowed_localhost_url(url)
        && !is_allowed_share_url(url)
    {
        return Err(LauncherError::friendly("URL não permitida pelo launcher."));
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
        let mut command = Command::new(process_utils::WINDOWS_GRAPHICAL_OPENER);
        process_utils::hide_child_window(&mut command);
        command
            .arg(url)
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

fn is_allowed_localhost_url(url: &str) -> bool {
    let Some(rest) = url.strip_prefix("http://localhost:") else {
        return false;
    };
    let port_text = rest.trim_end_matches('/');
    !port_text.is_empty()
        && port_text.chars().all(|ch| ch.is_ascii_digit())
        && port_text.parse::<u16>().is_ok()
}

fn is_allowed_share_url(url: &str) -> bool {
    tunnel::validation::validate_public_url(url).is_ok()
}

#[tauri::command]
#[allow(non_snake_case)]
fn openSite() -> Result<(), String> {
    command_result(open_allowed_url(&runtime::local_site_url()))
}

#[tauri::command]
#[allow(non_snake_case)]
fn openShareLink(url: String) -> Result<(), String> {
    let url = command_result(tunnel::validation::validate_public_url(&url))?;
    command_result(open_allowed_url(&url))
}

#[tauri::command]
#[allow(non_snake_case)]
fn openAdminer() -> Result<(), String> {
    command_result(open_allowed_url(&runtime::local_adminer_url()))
}

#[tauri::command]
#[allow(non_snake_case)]
fn openDockerGuide() -> Result<(), String> {
    command_result(open_allowed_url(
        "https://www.docker.com/products/docker-desktop/",
    ))
}

fn open_folder(path: &Path) -> LauncherResult<()> {
    if !path.exists() {
        std::fs::create_dir_all(path).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta local", error)
        })?;
    }

    #[cfg(target_os = "linux")]
    {
        for opener in ["xdg-open", "gio", "sensible-browser"] {
            let mut command = Command::new(opener);
            if opener == "gio" {
                command.arg("open");
            }
            scripts::sanitize_child_environment(&mut command);
            if command.arg(path).spawn().is_ok() {
                return Ok(());
            }
        }
        Err(LauncherError::friendly(
            "Não encontrei um abridor de pastas no Linux.",
        ))
    }

    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new(process_utils::WINDOWS_GRAPHICAL_OPENER);
        process_utils::hide_child_window(&mut command);
        command
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|error| LauncherError::technical("Não foi possível abrir pasta", error))
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map(|_| ())
            .map_err(|error| LauncherError::technical("Não foi possível abrir pasta", error))
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err(LauncherError::friendly(
            "Sistema não suportado para abrir pasta.",
        ))
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn openDataFolder() -> Result<(), String> {
    command_result(paths::mg_pocket_data_content_dir().and_then(|path| open_folder(&path)))
}

#[tauri::command]
#[allow(non_snake_case)]
fn openBackupsFolder() -> Result<(), String> {
    command_result(paths::mg_pocket_backups_dir().and_then(|path| open_folder(&path)))
}

#[tauri::command]
#[allow(non_snake_case)]
fn openLogsFolder() -> Result<(), String> {
    command_result(paths::mg_pocket_logs_dir().and_then(|path| open_folder(&path)))
}

#[tauri::command]
#[allow(non_snake_case)]
fn openInstallationFolder() -> Result<(), String> {
    command_result(paths::mg_pocket_data_dir().and_then(|path| open_folder(&path)))
}

pub fn run_uninstall_cleanup(remove_user_data: bool) -> i32 {
    let options = if remove_user_data {
        cleanup::CleanupOptions::uninstall_remove_everything()
    } else {
        cleanup::CleanupOptions::uninstall_keep_user_data()
    };
    match cleanup::cleanup_local_installation(options) {
        Ok(_) => 0,
        Err(error) => {
            eprintln!("{}", error.technical_message());
            1
        }
    }
}

pub fn run() {
    let closing = Arc::new(AtomicBool::new(false));
    tauri::Builder::default()
        .manage(JobManager::default())
        .setup(|app| {
            let lock = paths::acquire_instance_lock().map_err(|error| {
                Box::<dyn std::error::Error>::from(error.friendly_message().to_string())
            })?;
            app.manage(lock);
            tunnel::cleanup_stale_state();
            Ok(())
        })
        .on_window_event(move |window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if closing.swap(true, Ordering::SeqCst) {
                    return;
                }
                api.prevent_close();
                let window = window.clone();
                std::thread::spawn(move || {
                    let _ = tunnel::stop();
                    let _ = window.close();
                });
            }
        })
        .invoke_handler(tauri::generate_handler![
            doctor,
            quickDiagnose,
            installDockerLinux,
            checkSystemDependencies,
            installSystemDependencies,
            ensureDockerRunning,
            ensureDockerPermission,
            installProject,
            repairInstallation,
            startApp,
            stopApp,
            restartApp,
            openSite,
            openAdminer,
            openShareLink,
            openDockerGuide,
            openDataFolder,
            openBackupsFolder,
            openLogsFolder,
            openInstallationFolder,
            readLogs,
            backup,
            restoreBackup,
            resetLocalData,
            removeLocalProject,
            deleteLocalInstallation,
            cancelCurrentJob,
            getShareStatus,
            startShare,
            stopShare,
            getLocalStorageStatus
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar M&G Pocket Launcher");
}
