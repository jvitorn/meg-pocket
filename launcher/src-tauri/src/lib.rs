mod errors;
mod installers;
mod jobs;
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

#[tauri::command]
fn doctor(app: AppHandle, jobs: State<'_, JobManager>) -> Result<String, String> {
    let output = run_script_command(&app, &jobs, "doctor", "Diagnosticar", &[])?;
    Ok(output.stdout)
}

#[tauri::command]
#[allow(non_snake_case)]
fn installDockerLinux(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        run_script_command(&app, &jobs, "install-docker", "Instalar Docker", &[])
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        let _ = jobs;
        Err("A instalação automática do Docker é suportada apenas no Linux. No Windows, instale o Docker Desktop manualmente.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn checkSystemDependencies(app: AppHandle, jobs: State<'_, JobManager>) -> Result<String, String> {
    let output = run_script_command(
        &app,
        &jobs,
        "check-dependencies",
        "Verificar dependências",
        &[],
    )?;
    Ok(output.stdout)
}

#[tauri::command]
#[allow(non_snake_case)]
fn installSystemDependencies(
    app: AppHandle,
    jobs: State<'_, JobManager>,
) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        run_script_command(
            &app,
            &jobs,
            "install-system-dependencies",
            "Instalar dependências",
            &[],
        )
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        let _ = jobs;
        Err("A instalação automática de dependências do sistema é suportada apenas no Linux.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn ensureDockerRunning(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        run_script_command(
            &app,
            &jobs,
            "ensure-docker-running",
            "Verificar Docker",
            &[],
        )
    }

    #[cfg(target_os = "windows")]
    {
        run_script_command(&app, &jobs, "doctor", "Verificar Docker", &[])
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = app;
        let _ = jobs;
        Err("Sistema não suportado.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn ensureDockerPermission(
    app: AppHandle,
    jobs: State<'_, JobManager>,
) -> Result<CommandOutput, String> {
    #[cfg(target_os = "linux")]
    {
        run_script_command(
            &app,
            &jobs,
            "ensure-docker-permission",
            "Verificar permissões Docker",
            &[],
        )
    }

    #[cfg(target_os = "windows")]
    {
        run_script_command(&app, &jobs, "doctor", "Verificar permissões Docker", &[])
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = app;
        let _ = jobs;
        Err("Sistema não suportado.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn installProject(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    #[cfg(any(target_os = "linux", target_os = "windows"))]
    {
        run_script_command(
            &app,
            &jobs,
            "install-project",
            "Instalar/Atualizar M&G Pocket",
            &[],
        )
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = app;
        let _ = jobs;
        Err("Sistema não suportado.".to_string())
    }
}

#[tauri::command]
#[allow(non_snake_case)]
fn startApp(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    run_script_command(&app, &jobs, "start", "Iniciar M&G Pocket", &[])
}

#[tauri::command]
#[allow(non_snake_case)]
fn stopApp(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    run_script_command(&app, &jobs, "stop", "Parar M&G Pocket", &[])
}

#[tauri::command]
#[allow(non_snake_case)]
fn restartApp(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    run_script_command(&app, &jobs, "restart", "Reiniciar M&G Pocket", &[])
}

#[tauri::command]
#[allow(non_snake_case)]
fn readLogs(app: AppHandle, jobs: State<'_, JobManager>) -> Result<String, String> {
    let output = run_script_command(&app, &jobs, "logs", "Ler logs", &[])?;
    Ok(output.stdout)
}

#[tauri::command]
fn backup(app: AppHandle, jobs: State<'_, JobManager>) -> Result<CommandOutput, String> {
    run_script_command(&app, &jobs, "backup", "Backup", &[])
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn restoreBackup(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    backupPath: String,
    confirmed: bool,
) -> Result<CommandOutput, String> {
    if !confirmed {
        return Err("Restore exige confirmação explícita.".to_string());
    }

    run_script_command(
        &app,
        &jobs,
        "restore",
        "Restaurar backup",
        &[backupPath.as_str(), "--yes"],
    )
}

#[tauri::command(rename_all = "camelCase")]
#[allow(non_snake_case)]
fn resetLocalData(
    app: AppHandle,
    jobs: State<'_, JobManager>,
    confirmed: bool,
) -> Result<CommandOutput, String> {
    if !confirmed {
        return Err("Reset local exige confirmação explícita.".to_string());
    }

    run_script_command(&app, &jobs, "reset", "Resetar dados locais", &["--yes"])
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
            resetLocalData
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar M&G Pocket Launcher");
}
