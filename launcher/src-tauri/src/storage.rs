use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::Serialize;

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    tunnel::types::unix_timestamp_string,
};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalStorageStatus {
    pub installation_root_path: String,
    pub installation_size_bytes: u64,
    pub data_size_bytes: u64,
    pub backups_size_bytes: u64,
    pub logs_size_bytes: u64,
    pub downloads_size_bytes: u64,
    pub runtime_size_bytes: u64,
    pub updated_at: String,
}

pub fn local_storage_status() -> LauncherResult<LocalStorageStatus> {
    let root = paths::mg_pocket_data_dir()?;
    Ok(LocalStorageStatus {
        installation_root_path: root.to_string_lossy().to_string(),
        installation_size_bytes: dir_size(&root),
        data_size_bytes: dir_size(&paths::mg_pocket_data_content_dir()?),
        backups_size_bytes: dir_size(&paths::mg_pocket_backups_dir()?),
        logs_size_bytes: dir_size(&paths::mg_pocket_logs_dir()?),
        downloads_size_bytes: dir_size(&paths::mg_pocket_downloads_dir()?),
        runtime_size_bytes: dir_size(&paths::mg_pocket_runtime_dir()?),
        updated_at: unix_timestamp_string(),
    })
}

pub fn safe_remove_dir_all(path: &Path) -> LauncherResult<()> {
    if path.exists() {
        fs::remove_dir_all(path).map_err(|error| {
            if crate::errors::is_windows_file_lock(&error) {
                LauncherError::with_kind(
                    crate::errors::LauncherErrorKind::FileLocked,
                    "O Windows informou que um arquivo ainda está em uso. Feche o M&G Pocket, aguarde alguns segundos e tente novamente.",
                    format!("remove_dir_all {}: {error}", path.display()),
                )
            } else {
                LauncherError::technical("Não foi possível remover pasta local", error)
            }
        })?;
    }
    Ok(())
}

fn dir_size(path: &Path) -> u64 {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return 0;
    };
    if metadata.file_type().is_symlink() {
        return 0;
    }
    if metadata.is_file() {
        return metadata.len();
    }
    if !metadata.is_dir() {
        return 0;
    }

    let Ok(entries) = fs::read_dir(path) else {
        return 0;
    };
    entries
        .filter_map(Result::ok)
        .map(|entry| dir_size(&entry.path()))
        .sum()
}

pub fn is_dangerous_delete_path(path: &Path) -> bool {
    if path.as_os_str().is_empty() {
        return true;
    }
    let components: Vec<_> = path.components().collect();
    components.len() < 3 || is_user_home(path) || is_local_app_data_root(path)
}

fn is_user_home(path: &Path) -> bool {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .map(|home| path_matches(path, &home))
        .unwrap_or(false)
}

fn is_local_app_data_root(path: &Path) -> bool {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|local| path_matches(path, &local))
        .unwrap_or(false)
}

fn path_matches(a: &Path, b: &Path) -> bool {
    let a = a.canonicalize().unwrap_or_else(|_| a.to_path_buf());
    let b = b.canonicalize().unwrap_or_else(|_| b.to_path_buf());
    a == b
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn dir_size_skips_missing_paths() {
        let tmp = TempDir::new().unwrap();
        assert_eq!(dir_size(&tmp.path().join("missing")), 0);
    }

    #[test]
    fn dir_size_counts_nested_files() {
        let tmp = TempDir::new().unwrap();
        fs::create_dir_all(tmp.path().join("data")).unwrap();
        fs::write(tmp.path().join("data/a.txt"), b"1234").unwrap();
        fs::write(tmp.path().join("b.txt"), b"12").unwrap();
        assert_eq!(dir_size(tmp.path()), 6);
    }

    #[test]
    fn dangerous_delete_path_rejects_empty_and_short_paths() {
        assert!(is_dangerous_delete_path(Path::new("")));
        assert!(is_dangerous_delete_path(Path::new("/")));
    }
}
