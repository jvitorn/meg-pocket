use std::{
    env,
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    process,
};

use tauri::{path::BaseDirectory, AppHandle, Manager};

use crate::errors::{LauncherError, LauncherResult};

pub const INSTALLERS_VERSION_FILE: &str = ".installers-version";

pub fn launcher_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

pub fn is_installers_dir(path: &Path) -> bool {
    path.join("linux").join("doctor.sh").is_file()
        && path.join("windows").join("doctor.ps1").is_file()
        && path.join("bootstrap").join("linux.sh").is_file()
        && path.join("bootstrap").join("windows.ps1").is_file()
}

pub fn normalize_candidate(path: PathBuf) -> PathBuf {
    path.components().collect()
}

pub fn dev_installers_dir() -> Option<PathBuf> {
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

pub fn launcher_data_dir() -> LauncherResult<PathBuf> {
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

    Err(LauncherError::friendly(
        "Não consegui resolver a pasta local do launcher.",
    ))
}

pub fn mg_pocket_data_dir() -> LauncherResult<PathBuf> {
    if let Ok(path) = env::var("MG_POCKET_DATA_DIR") {
        if !path.trim().is_empty() {
            return Ok(PathBuf::from(path));
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
            return Ok(PathBuf::from(local_app_data).join("MG Pocket"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(home) = env::var_os("HOME") {
            return Ok(PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("MG Pocket"));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Some(home) = env::var_os("HOME") {
            return Ok(PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("MG Pocket"));
        }
    }

    Err(LauncherError::friendly(
        "Não consegui resolver a pasta local do M&G Pocket.",
    ))
}

pub fn mg_pocket_config_dir() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_data_dir()?.join("config"))
}

pub fn mg_pocket_runtime_dir() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_data_dir()?.join("runtime"))
}

pub fn mg_pocket_app_dir() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_data_dir()?.join("app"))
}

pub fn mg_pocket_data_content_dir() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_data_dir()?.join("data"))
}

pub fn mg_pocket_backups_dir() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_data_dir()?.join("backups"))
}

pub fn mg_pocket_logs_dir() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_data_dir()?.join("logs"))
}

pub fn mg_pocket_downloads_dir() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_data_dir()?.join("downloads"))
}

pub fn mg_pocket_tmp_dir() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_data_dir()?.join("tmp"))
}

pub fn launcher_lock_path() -> LauncherResult<PathBuf> {
    Ok(mg_pocket_config_dir()?.join("launcher.lock"))
}

pub struct InstanceLock {
    path: PathBuf,
    pid: u32,
}

impl Drop for InstanceLock {
    fn drop(&mut self) {
        let should_remove = fs::read_to_string(&self.path)
            .ok()
            .and_then(|text| text.trim().parse::<u32>().ok())
            .map(|pid| pid == self.pid)
            .unwrap_or(false);

        if should_remove {
            let _ = fs::remove_file(&self.path);
        }
    }
}

pub fn acquire_instance_lock() -> LauncherResult<InstanceLock> {
    let path = launcher_lock_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de configuração", error)
        })?;
    }

    let pid = process::id();
    match OpenOptions::new().write(true).create_new(true).open(&path) {
        Ok(mut file) => {
            writeln!(file, "{pid}").map_err(|error| {
                LauncherError::technical("Não foi possível gravar lock do launcher", error)
            })?;
            return Ok(InstanceLock { path, pid });
        }
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(error) => {
            return Err(LauncherError::technical(
                "Não foi possível criar lock do launcher",
                error,
            ));
        }
    }

    let stale = fs::read_to_string(&path)
        .ok()
        .and_then(|text| text.trim().parse::<u32>().ok())
        .map(|existing_pid| !process_alive(existing_pid))
        .unwrap_or(true);

    if stale {
        let _ = fs::remove_file(&path);
        return acquire_instance_lock();
    }

    Err(LauncherError::friendly(
        "O M&G Pocket Launcher já está aberto. Verifique a janela existente.",
    ))
}

fn process_alive(pid: u32) -> bool {
    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("tasklist")
            .args(["/FI", &format!("PID eq {pid}"), "/NH"])
            .output();
        return output
            .ok()
            .and_then(|output| String::from_utf8(output.stdout).ok())
            .map(|text| text.contains(&pid.to_string()))
            .unwrap_or(false);
    }

    #[cfg(not(target_os = "windows"))]
    {
        PathBuf::from(format!("/proc/{pid}")).exists()
    }
}

pub fn local_installers_dir() -> LauncherResult<PathBuf> {
    Ok(launcher_data_dir()?.join("installers"))
}

pub fn bundled_installers_dir(app: &AppHandle) -> Option<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(path) = app.path().resolve("installers", BaseDirectory::Resource) {
        candidates.push(path);
    }

    if let Ok(path) = app
        .path()
        .resolve("../../installers", BaseDirectory::Resource)
    {
        candidates.push(path);
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("installers"));
        candidates.push(resource_dir.join("_up_").join("_up_").join("installers"));
        candidates.push(resource_dir.join("../installers"));
        candidates.push(resource_dir.join("../../installers"));
        candidates.push(resource_dir);
    }

    candidates
        .into_iter()
        .map(normalize_candidate)
        .find(|path| is_installers_dir(path))
}
