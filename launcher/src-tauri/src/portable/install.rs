use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{
        diagnose,
        nginx,
        types::{PortableRuntimeConfig, unix_timestamp_string},
    },
};

pub fn portable_root() -> PathBuf {
    paths::mg_pocket_data_dir().unwrap_or_else(|_| PathBuf::from("."))
}

pub fn ensure_layout() -> LauncherResult<()> {
    for dir in [
        paths::mg_pocket_runtime_dir()?,
        paths::mg_pocket_app_dir()?,
        paths::mg_pocket_config_dir()?,
        paths::mg_pocket_data_content_dir()?,
        paths::mg_pocket_data_content_dir()?.join("postgres"),
        paths::mg_pocket_data_content_dir()?.join("uploads"),
        paths::mg_pocket_backups_dir()?,
        paths::mg_pocket_logs_dir()?,
        paths::mg_pocket_downloads_dir()?,
        paths::mg_pocket_tmp_dir()?,
    ] {
        fs::create_dir_all(&dir).map_err(|error| {
            LauncherError::technical(format!("Não foi possível criar {}", dir.display()), error)
        })?;
    }

    fs::write(
        paths::mg_pocket_data_content_dir()?
            .join("uploads")
            .join(".meg-pocket-health"),
        "ok\n",
    )
    .map_err(|error| LauncherError::technical("Não foi possível criar health de uploads", error))?;
    Ok(())
}

pub fn configure_runtime(version: &str, runtime_version: &str) -> LauncherResult<PortableRuntimeConfig> {
    ensure_layout()?;
    let public_port = choose_port(&[3000, 3005, 3010, 3015]);
    let next_port = public_port.saturating_add(1);
    let postgres_port = choose_port(&[54321, 54322, 54323]);
    let config = PortableRuntimeConfig {
        runtime_mode: "portable".to_string(),
        version: version.to_string(),
        runtime_version: runtime_version.to_string(),
        public_port,
        next_port,
        postgres_port,
        app_url: format!("http://localhost:{public_port}"),
        installed_at: unix_timestamp_string(),
    };
    write_env(&config)?;
    nginx::write_config(&config)?;
    write_runtime_config(&config)?;
    Ok(config)
}

pub fn read_or_create_runtime_config() -> LauncherResult<PortableRuntimeConfig> {
    if let Some(config) = diagnose::read_runtime_config() {
        return Ok(config);
    }
    configure_runtime("desconhecida", "desconhecido")
}

pub fn write_runtime_config(config: &PortableRuntimeConfig) -> LauncherResult<()> {
    let config_dir = paths::mg_pocket_config_dir()?;
    fs::create_dir_all(&config_dir).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta de configuração", error)
    })?;
    fs::write(
        config_dir.join("runtime.json"),
        serde_json::to_string_pretty(config).unwrap_or_else(|_| "{}".to_string()),
    )
    .map_err(|error| LauncherError::technical("Não foi possível gravar runtime.json", error))
}

pub fn validate_runtime_root(root: &Path) -> LauncherResult<()> {
    let missing = diagnose::required_paths()
        .into_iter()
        .filter(|relative| !root.join(relative).exists())
        .map(|relative| relative.display().to_string())
        .collect::<Vec<_>>();

    if missing.is_empty() {
        Ok(())
    } else {
        Err(LauncherError::new(
            "A instalação local está incompleta. Use Reparar instalação.",
            format!("Arquivos ausentes no runtime extraído:\n{}", missing.join("\n")),
        ))
    }
}

fn write_env(config: &PortableRuntimeConfig) -> LauncherResult<()> {
    let data_dir = paths::mg_pocket_data_content_dir()?;
    let database_url = format!(
        "postgresql://meg:meg@127.0.0.1:{}/meg_pocket?schema=public",
        config.postgres_port
    );
    let content = format!(
        r#"DATABASE_URL="{database_url}"
DIRECT_URL="{database_url}"
NEXTAUTH_SECRET="meg-pocket-portable-local"
NEXTAUTH_URL="{app_url}"
NEXT_PUBLIC_BASE_URL="{app_url}"
PORT="{next_port}"
HOSTNAME="127.0.0.1"
STORAGE_DRIVER="local"
STORAGE_BUCKET="personagens"
STORAGE_LOCAL_DIR="{uploads_dir}"
STORAGE_LOCAL_PUBLIC_URL="/uploads"
NEXT_PUBLIC_STORAGE_MAX_FILE_SIZE_MB="40"
"#,
        app_url = config.app_url,
        next_port = config.next_port,
        uploads_dir = data_dir.join("uploads").to_string_lossy().replace('\\', "/"),
    );
    fs::write(paths::mg_pocket_config_dir()?.join(".env.portable"), content)
        .map_err(|error| LauncherError::technical("Não foi possível gravar .env.portable", error))
}

fn choose_port(candidates: &[u16]) -> u16 {
    candidates
        .iter()
        .copied()
        .find(|port| !diagnose::check_local_port(*port, std::time::Duration::from_millis(700)))
        .unwrap_or_else(|| candidates[0])
}
