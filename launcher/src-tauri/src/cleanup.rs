use std::{fs, path::Path};

use serde::Serialize;

use crate::{
    errors::{LauncherError, LauncherResult},
    paths, storage, tunnel,
};

#[derive(Clone, Copy, Debug)]
pub struct CleanupOptions {
    pub remove_runtime: bool,
    pub remove_user_data: bool,
    pub remove_backups: bool,
    pub remove_launcher_cache: bool,
    pub remove_webview_cache: bool,
    pub stop_processes: bool,
    pub stop_tunnel: bool,
}

impl CleanupOptions {
    pub fn portable_delete() -> Self {
        Self {
            remove_runtime: true,
            remove_user_data: true,
            remove_backups: true,
            remove_launcher_cache: true,
            remove_webview_cache: false,
            stop_processes: true,
            stop_tunnel: true,
        }
    }

    pub fn uninstall_remove_everything() -> Self {
        Self {
            remove_runtime: true,
            remove_user_data: true,
            remove_backups: true,
            remove_launcher_cache: true,
            remove_webview_cache: true,
            stop_processes: true,
            stop_tunnel: true,
        }
    }

    pub fn uninstall_keep_user_data() -> Self {
        Self {
            remove_runtime: false,
            remove_user_data: false,
            remove_backups: false,
            remove_launcher_cache: true,
            remove_webview_cache: true,
            stop_processes: true,
            stop_tunnel: true,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupReport {
    pub removed_paths: Vec<String>,
    pub preserved_paths: Vec<String>,
}

pub fn cleanup_local_installation(options: CleanupOptions) -> LauncherResult<CleanupReport> {
    if options.stop_tunnel {
        let _ = tunnel::stop();
    }
    if options.stop_processes {
        crate::portable::process::stop_best_effort_for_cleanup();
    }

    let mut report = CleanupReport {
        removed_paths: Vec::new(),
        preserved_paths: Vec::new(),
    };

    let root = paths::mg_pocket_data_dir()?;
    if options.remove_runtime && options.remove_user_data && options.remove_backups {
        validate_mg_pocket_root_for_delete(&root)?;
        storage::safe_remove_dir_all(&root)?;
        report
            .removed_paths
            .push(root.to_string_lossy().to_string());
    } else {
        report
            .preserved_paths
            .push(root.to_string_lossy().to_string());
        if options.remove_runtime {
            remove_child(&root, "runtime", &mut report)?;
            remove_child(&root, "downloads", &mut report)?;
            remove_child(&root, "tmp", &mut report)?;
        }
        if options.remove_user_data {
            remove_child(&root, "data", &mut report)?;
        }
        if options.remove_backups {
            remove_child(&root, "backups", &mut report)?;
        }
    }

    if options.remove_launcher_cache {
        let cache = paths::launcher_data_dir()?;
        validate_launcher_cache_for_delete(&cache)?;
        storage::safe_remove_dir_all(&cache)?;
        report
            .removed_paths
            .push(cache.to_string_lossy().to_string());
    }

    if options.remove_webview_cache {
        for path in webview_cache_candidates() {
            if path.exists() && validate_webview_cache_for_delete(&path).is_ok() {
                storage::safe_remove_dir_all(&path)?;
                report
                    .removed_paths
                    .push(path.to_string_lossy().to_string());
            }
        }
    }

    Ok(report)
}

fn remove_child(root: &Path, child: &str, report: &mut CleanupReport) -> LauncherResult<()> {
    let path = root.join(child);
    validate_child_delete_path(root, &path, child)?;
    storage::safe_remove_dir_all(&path)?;
    report
        .removed_paths
        .push(path.to_string_lossy().to_string());
    Ok(())
}

pub fn validate_mg_pocket_root_for_delete(path: &Path) -> LauncherResult<()> {
    if storage::is_dangerous_delete_path(path) {
        return Err(LauncherError::friendly(
            "Recusado: caminho perigoso para exclusão.",
        ));
    }
    if path.exists() {
        let metadata = fs::symlink_metadata(path).map_err(|error| {
            LauncherError::technical("Não foi possível validar pasta local", error)
        })?;
        if metadata.file_type().is_symlink() {
            return Err(LauncherError::friendly(
                "Recusado: a pasta local resolve para um link simbólico.",
            ));
        }
        let has_marker = path.join("config").join("runtime.json").exists()
            || path.join("config").join("processes.json").exists()
            || path.join("app").join("server.js").exists()
            || path.join("runtime").is_dir();
        if !has_marker {
            return Err(LauncherError::friendly(
                "A pasta não contém marcadores do M&G Pocket. Exclusão recusada por segurança.",
            ));
        }
    }
    if path.file_name().and_then(|name| name.to_str()) != Some("MG Pocket") {
        return Err(LauncherError::friendly(
            "Recusado: o nome da pasta não é 'MG Pocket'.",
        ));
    }
    Ok(())
}

pub fn validate_launcher_cache_for_delete(path: &Path) -> LauncherResult<()> {
    if storage::is_dangerous_delete_path(path) {
        return Err(LauncherError::friendly(
            "Recusado: caminho perigoso para exclusão.",
        ));
    }
    if path.file_name().and_then(|name| name.to_str()) != Some("mg-pocket-launcher") {
        return Err(LauncherError::friendly(
            "Recusado: cache do launcher inesperado.",
        ));
    }
    Ok(())
}

fn validate_child_delete_path(root: &Path, path: &Path, expected_name: &str) -> LauncherResult<()> {
    validate_mg_pocket_root_for_delete(root)?;
    if path.file_name().and_then(|name| name.to_str()) != Some(expected_name) {
        return Err(LauncherError::friendly(
            "Recusado: subpasta inesperada para exclusão.",
        ));
    }
    if path.exists() {
        let metadata = fs::symlink_metadata(path).map_err(|error| {
            LauncherError::technical("Não foi possível validar subpasta local", error)
        })?;
        if metadata.file_type().is_symlink() {
            return Err(LauncherError::friendly(
                "Recusado: subpasta local resolve para link simbólico.",
            ));
        }
    }
    Ok(())
}

fn validate_webview_cache_for_delete(path: &Path) -> LauncherResult<()> {
    if storage::is_dangerous_delete_path(path) {
        return Err(LauncherError::friendly(
            "Recusado: caminho perigoso para exclusão.",
        ));
    }
    let text = path.to_string_lossy();
    if !text.contains("br.com.megpocket.launcher") {
        return Err(LauncherError::friendly(
            "Recusado: cache WebView inesperado.",
        ));
    }
    Ok(())
}

fn webview_cache_candidates() -> Vec<std::path::PathBuf> {
    let mut candidates = Vec::new();
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        let local = std::path::PathBuf::from(local);
        candidates.push(local.join("br.com.megpocket.launcher"));
        candidates.push(local.join("WebView2").join("br.com.megpocket.launcher"));
    }
    if let Some(home) = std::env::var_os("HOME") {
        let home = std::path::PathBuf::from(home);
        candidates.push(
            home.join(".local")
                .join("share")
                .join("br.com.megpocket.launcher"),
        );
        candidates.push(home.join(".cache").join("br.com.megpocket.launcher"));
    }
    candidates
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn validates_mg_pocket_root_with_marker() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().join("MG Pocket");
        fs::create_dir_all(root.join("config")).unwrap();
        fs::write(root.join("config/runtime.json"), "{}").unwrap();
        assert!(validate_mg_pocket_root_for_delete(&root).is_ok());
    }

    #[test]
    fn rejects_folder_without_marker() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().join("MG Pocket");
        fs::create_dir_all(&root).unwrap();
        assert!(validate_mg_pocket_root_for_delete(&root).is_err());
    }

    #[test]
    fn rejects_launcher_cache_with_wrong_name() {
        let tmp = TempDir::new().unwrap();
        assert!(validate_launcher_cache_for_delete(tmp.path()).is_err());
    }
}
