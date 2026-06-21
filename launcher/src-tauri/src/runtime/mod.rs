pub mod detection;
pub mod types;

use serde_json::{json, Value};
use tauri::AppHandle;

use crate::{
    docker,
    errors::{LauncherError, LauncherResult},
    jobs::JobManager,
    paths, portable,
    runtime::{detection::detect_runtime_mode, types::RuntimeMode},
    scripts::CommandOutput,
};

pub fn runtime_mode() -> RuntimeMode {
    let mode = detect_runtime_mode();
    let _ = detection::persist_runtime_mode(mode);
    mode
}

pub fn quick_diagnose() -> LauncherResult<String> {
    match runtime_mode() {
        RuntimeMode::Docker => annotate_status(docker::quick_diagnose()?, RuntimeMode::Docker),
        RuntimeMode::Portable => portable::quick_diagnose(),
    }
}

pub fn doctor(app: &AppHandle, jobs: &JobManager) -> LauncherResult<String> {
    match runtime_mode() {
        RuntimeMode::Docker => annotate_status(docker::doctor(app, jobs)?, RuntimeMode::Docker),
        RuntimeMode::Portable => portable::doctor(app, jobs),
    }
}

pub fn check_system_dependencies() -> LauncherResult<String> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::check_system_dependencies(),
        RuntimeMode::Portable => Ok(json!({
            "os": current_os(),
            "supported": cfg!(target_os = "windows"),
            "missing": [],
            "packages": [],
            "installable": false,
            "sudoRequired": false,
            "installCommand": "",
            "commands": [],
            "manualInstructions": "O modo portátil não exige Docker, WSL2 ou instalação manual de Node/PostgreSQL/Nginx."
        })
        .to_string()),
    }
}

pub fn install_project(
    app: &AppHandle,
    jobs: &JobManager,
    use_sudo_docker: bool,
    light_build: bool,
    local_build: bool,
    no_cache: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::install_project(
            app,
            jobs,
            use_sudo_docker,
            light_build,
            local_build,
            no_cache,
        ),
        RuntimeMode::Portable => portable::install_project(app, jobs),
    }
}

pub fn repair_installation(
    app: &AppHandle,
    jobs: &JobManager,
    use_sudo_docker: bool,
    light_build: bool,
    local_build: bool,
    no_cache: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::repair_installation(
            app,
            jobs,
            use_sudo_docker,
            light_build,
            local_build,
            no_cache,
        ),
        RuntimeMode::Portable => portable::repair_installation(app, jobs),
    }
}

pub fn start_app(
    app: &AppHandle,
    jobs: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::start_app(app, jobs, use_sudo_docker),
        RuntimeMode::Portable => portable::start_app(app, jobs),
    }
}

pub fn stop_app(
    app: &AppHandle,
    jobs: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::stop_app(app, jobs, use_sudo_docker),
        RuntimeMode::Portable => portable::stop_app(app, jobs),
    }
}

pub fn restart_app(
    app: &AppHandle,
    jobs: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::restart_app(app, jobs, use_sudo_docker),
        RuntimeMode::Portable => portable::restart_app(app, jobs),
    }
}

pub fn read_logs(
    app: &AppHandle,
    jobs: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<String> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::read_logs(app, jobs, use_sudo_docker),
        RuntimeMode::Portable => portable::read_logs(app, jobs),
    }
}

pub fn backup(
    app: &AppHandle,
    jobs: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::backup(app, jobs, use_sudo_docker),
        RuntimeMode::Portable => portable::backup(app, jobs),
    }
}

pub fn restore_backup(
    app: &AppHandle,
    jobs: &JobManager,
    backup_path: String,
    confirmed: bool,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Docker => {
            docker::restore_backup(app, jobs, backup_path, confirmed, use_sudo_docker)
        }
        RuntimeMode::Portable => portable::restore_backup(app, jobs, backup_path, confirmed),
    }
}

pub fn reset_local_data(
    app: &AppHandle,
    jobs: &JobManager,
    confirmed: bool,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Docker => docker::reset_local_data(app, jobs, confirmed, use_sudo_docker),
        RuntimeMode::Portable => portable::reset_local_data(app, jobs, confirmed),
    }
}

pub fn delete_local_installation(
    app: &AppHandle,
    jobs: &JobManager,
    confirmed: bool,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    match runtime_mode() {
        RuntimeMode::Portable => portable::delete_local_installation(app, jobs, confirmed),
        RuntimeMode::Docker => docker::remove_local_project(
            app,
            jobs,
            "complete".to_string(),
            confirmed,
            use_sudo_docker,
        ),
    }
}

pub fn local_site_url() -> String {
    match runtime_mode() {
        RuntimeMode::Docker => docker::local_site_url(),
        RuntimeMode::Portable => portable::local_site_url(),
    }
}

pub fn local_adminer_url() -> String {
    docker::local_adminer_url()
}

pub fn cancel_current_job(job_manager: &JobManager) -> LauncherResult<bool> {
    docker::cancel_current_job(job_manager)
}

fn annotate_status(raw: String, mode: RuntimeMode) -> LauncherResult<String> {
    let mut value = serde_json::from_str::<Value>(&raw).map_err(|error| {
        LauncherError::technical("Não foi possível ler diagnóstico do runtime", error)
    })?;
    let object = value
        .as_object_mut()
        .ok_or_else(|| LauncherError::friendly("Diagnóstico retornou um formato inválido."))?;
    object.insert("runtimeMode".to_string(), json!(mode.as_str()));
    object.insert("runtimeLabel".to_string(), json!(mode.label()));
    object.insert(
        "portableInstalled".to_string(),
        json!(portable::diagnose::is_installed()),
    );
    object.insert(
        "localDataPath".to_string(),
        json!(path_string(paths::mg_pocket_data_content_dir())),
    );
    object.insert(
        "localBackupsPath".to_string(),
        json!(path_string(paths::mg_pocket_backups_dir())),
    );
    object.insert(
        "localLogsPath".to_string(),
        json!(path_string(paths::mg_pocket_logs_dir())),
    );
    serde_json::to_string(&value).map_err(|error| {
        LauncherError::technical("Não foi possível serializar diagnóstico do runtime", error)
    })
}

fn path_string(path: LauncherResult<std::path::PathBuf>) -> String {
    path.map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default()
}

fn current_os() -> &'static str {
    if cfg!(target_os = "linux") {
        "linux"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "unknown"
    }
}
