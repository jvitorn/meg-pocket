use std::{
    env,
    path::{Path, PathBuf},
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
