use std::{
    fs, io,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use tauri::AppHandle;

use crate::{
    errors::{installers_io_error, LauncherError, LauncherResult},
    paths::{
        bundled_installers_dir, dev_installers_dir, is_installers_dir, launcher_data_dir,
        launcher_version, local_installers_dir, INSTALLERS_VERSION_FILE,
    },
};

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(1);

pub fn installers_dir(app: &AppHandle) -> LauncherResult<PathBuf> {
    if cfg!(debug_assertions) {
        if let Some(path) = dev_installers_dir() {
            return Ok(path);
        }
    }

    let local = local_installers_dir()?;
    if local_installers_current(&local) {
        return Ok(local);
    }

    if let Some(source) = bundled_installers_dir(app) {
        return prepare_bundled_installers(&source, &local);
    }

    if is_installers_dir(&local) {
        return Ok(local);
    }

    Err(LauncherError::new(
        "Não encontrei os scripts installers/ do launcher.",
        "A pasta installers/ não foi encontrada nos resources e a cópia local está ausente ou incompleta.",
    ))
}

fn local_installers_current(path: &Path) -> bool {
    if !is_installers_dir(path) {
        return false;
    }

    let version_path = path.join(INSTALLERS_VERSION_FILE);
    fs::read_to_string(version_path)
        .map(|version| version.trim() == launcher_version())
        .unwrap_or(false)
}

fn prepare_bundled_installers(source: &Path, destination: &Path) -> LauncherResult<PathBuf> {
    if !is_installers_dir(source) {
        return Err(LauncherError::new(
            "Não encontrei a pasta installers embutida no bundle do launcher.",
            format!("Resource inválido: {}", source.display()),
        ));
    }

    let data_dir = launcher_data_dir()?;
    retry_io("criar pasta local do launcher", || {
        fs::create_dir_all(&data_dir)
    })?;
    cleanup_old_temporaries(&data_dir, None);

    let temp_dir = data_dir.join(format!(
        "installers_tmp_{}_{}",
        std::process::id(),
        TEMP_COUNTER.fetch_add(1, Ordering::Relaxed)
    ));

    if temp_dir.exists() {
        retry_remove_dir_all(&temp_dir)?;
    }

    retry_io("criar pasta temporária de installers", || {
        fs::create_dir_all(&temp_dir)
    })?;

    if let Err(error) = copy_dir_all(source, &temp_dir) {
        let _ = retry_remove_dir_all(&temp_dir);
        return Err(error);
    }

    retry_io("gravar versão dos installers", || {
        fs::write(temp_dir.join(INSTALLERS_VERSION_FILE), launcher_version())
    })?;

    if !is_installers_dir(&temp_dir) {
        let _ = retry_remove_dir_all(&temp_dir);
        return Err(LauncherError::new(
            "Não foi possível preparar os scripts do launcher.",
            format!(
                "A cópia temporária dos installers ficou incompleta: {}",
                temp_dir.display()
            ),
        ));
    }

    if let Err(error) = swap_installers_dir(&temp_dir, destination) {
        let _ = retry_remove_dir_all(&temp_dir);
        return Err(error);
    }

    cleanup_old_temporaries(&data_dir, None);

    if is_installers_dir(destination) {
        Ok(destination.to_path_buf())
    } else {
        Err(LauncherError::new(
            "Não foi possível preparar os scripts do launcher.",
            format!(
                "A pasta final dos installers ficou incompleta: {}",
                destination.display()
            ),
        ))
    }
}

fn copy_dir_all(source: &Path, destination: &Path) -> LauncherResult<()> {
    retry_io("criar pasta de destino dos installers", || {
        fs::create_dir_all(destination)
    })?;

    let entries = retry_io("ler pasta de installers empacotada", || {
        fs::read_dir(source)
    })?;
    for entry in entries {
        let entry = entry.map_err(|error| installers_io_error("ler item de installers", error))?;
        let source_path = entry.path();
        let target_path = destination.join(entry.file_name());
        let file_type = retry_io("identificar item de installers", || entry.file_type())?;

        if file_type.is_dir() {
            copy_dir_all(&source_path, &target_path)?;
        } else if file_type.is_file() {
            retry_io("copiar script do launcher", || {
                fs::copy(&source_path, &target_path).map(|_| ())
            })?;

            #[cfg(unix)]
            if target_path
                .extension()
                .and_then(|extension| extension.to_str())
                == Some("sh")
            {
                let mut permissions =
                    retry_io("ler permissão do script", || fs::metadata(&target_path))?
                        .permissions();
                permissions.set_mode(0o755);
                retry_io("aplicar permissão de execução no script", || {
                    fs::set_permissions(&target_path, permissions.clone())
                })?;
            }
        }
    }

    Ok(())
}

fn swap_installers_dir(temp_dir: &Path, destination: &Path) -> LauncherResult<()> {
    let parent = destination.parent().ok_or_else(|| {
        LauncherError::new(
            "Não foi possível preparar os scripts do launcher.",
            format!(
                "A pasta final dos installers não tem diretório pai: {}",
                destination.display()
            ),
        )
    })?;

    retry_io("criar pasta local do launcher", || {
        fs::create_dir_all(parent)
    })?;

    let old_dir = parent.join(format!(
        "installers_old_{}_{}",
        timestamp_millis(),
        TEMP_COUNTER.fetch_add(1, Ordering::Relaxed)
    ));

    if old_dir.exists() {
        retry_remove_dir_all(&old_dir)?;
    }

    if destination.exists() {
        retry_rename(destination, &old_dir)?;
    }

    match retry_rename(temp_dir, destination) {
        Ok(()) => {
            if old_dir.exists() {
                let _ = retry_remove_dir_all(&old_dir);
            }
            Ok(())
        }
        Err(error) => {
            if old_dir.exists() && !destination.exists() {
                let _ = retry_rename(&old_dir, destination);
            }
            Err(error)
        }
    }
}

fn cleanup_old_temporaries(parent: &Path, keep: Option<&Path>) {
    let Ok(entries) = fs::read_dir(parent) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if keep.is_some_and(|keep| keep == path.as_path()) {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with("installers_tmp_") || name.starts_with("installers_old_") {
            let _ = retry_remove_dir_all(&path);
        }
    }
}

fn retry_rename(source: &Path, destination: &Path) -> LauncherResult<()> {
    retry_io(
        &format!(
            "renomear {} para {}",
            source.display(),
            destination.display()
        ),
        || fs::rename(source, destination),
    )
}

fn retry_remove_dir_all(path: &Path) -> LauncherResult<()> {
    if !path.exists() {
        return Ok(());
    }

    retry_io(&format!("remover pasta {}", path.display()), || {
        fs::remove_dir_all(path)
    })
}

#[allow(dead_code)]
fn retry_remove_file(path: &Path) -> LauncherResult<()> {
    if !path.exists() {
        return Ok(());
    }

    retry_io(&format!("remover arquivo {}", path.display()), || {
        fs::remove_file(path)
    })
}

fn retry_io<T>(action: &str, mut operation: impl FnMut() -> io::Result<T>) -> LauncherResult<T> {
    let delays = [
        Duration::from_millis(60),
        Duration::from_millis(120),
        Duration::from_millis(240),
        Duration::from_millis(480),
        Duration::from_millis(900),
    ];
    let mut last_error = None;

    for delay in delays {
        match operation() {
            Ok(value) => return Ok(value),
            Err(error) => {
                last_error = Some(error);
                thread::sleep(delay);
            }
        }
    }

    operation().map_err(|error| {
        let error = last_error.unwrap_or(error);
        installers_io_error(action, error)
    })
}

fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
