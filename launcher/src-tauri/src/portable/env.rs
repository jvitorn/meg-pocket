use std::{fs, process::Command};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::types::PortableRuntimeConfig,
};

pub const NEXT_ENV_KEYS: &[&str] = &[
    "DATABASE_URL",
    "DIRECT_URL",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "NEXT_PUBLIC_BASE_URL",
    "PORT",
    "HOSTNAME",
    "STORAGE_DRIVER",
    "STORAGE_BUCKET",
    "STORAGE_LOCAL_DIR",
    "STORAGE_LOCAL_PUBLIC_URL",
    "NEXT_PUBLIC_STORAGE_MAX_FILE_SIZE_MB",
];

pub fn database_url(config: &PortableRuntimeConfig) -> String {
    format!(
        "postgresql://meg:meg@127.0.0.1:{}/meg_pocket?schema=public",
        config.postgres_port
    )
}

pub fn vars(config: &PortableRuntimeConfig) -> LauncherResult<Vec<(String, String)>> {
    let database_url = database_url(config);
    let uploads_dir = paths::mg_pocket_data_content_dir()?
        .join("uploads")
        .to_string_lossy()
        .replace('\\', "/");

    let entries = vec![
        ("DATABASE_URL".to_string(), database_url.clone()),
        ("DIRECT_URL".to_string(), database_url),
        ("NEXTAUTH_SECRET".to_string(), auth_secret()?),
        ("NEXTAUTH_URL".to_string(), config.app_url.clone()),
        ("NEXT_PUBLIC_BASE_URL".to_string(), config.app_url.clone()),
        ("PORT".to_string(), config.next_port.to_string()),
        ("HOSTNAME".to_string(), "127.0.0.1".to_string()),
        ("STORAGE_DRIVER".to_string(), "local".to_string()),
        ("STORAGE_BUCKET".to_string(), "personagens".to_string()),
        ("STORAGE_LOCAL_DIR".to_string(), uploads_dir),
        (
            "STORAGE_LOCAL_PUBLIC_URL".to_string(),
            "/uploads".to_string(),
        ),
        (
            "NEXT_PUBLIC_STORAGE_MAX_FILE_SIZE_MB".to_string(),
            "40".to_string(),
        ),
    ];
    debug_assert_eq!(
        entries
            .iter()
            .map(|(key, _)| key.as_str())
            .collect::<Vec<_>>(),
        NEXT_ENV_KEYS
    );
    Ok(entries)
}

pub fn apply_to_command(
    command: &mut Command,
    config: &PortableRuntimeConfig,
) -> LauncherResult<()> {
    for (key, value) in vars(config)? {
        command.env(key, value);
    }
    Ok(())
}

pub fn apply_database_env(command: &mut Command, config: &PortableRuntimeConfig) {
    let database_url = database_url(config);
    command.env("DATABASE_URL", &database_url);
    command.env("DIRECT_URL", database_url);
}

pub fn write_file(config: &PortableRuntimeConfig) -> LauncherResult<()> {
    let content = vars(config)?
        .into_iter()
        .map(|(key, value)| format!("{key}=\"{}\"", escape_env_value(&value)))
        .collect::<Vec<_>>()
        .join("\n");

    fs::write(
        paths::mg_pocket_config_dir()?.join(".env.portable"),
        format!("{content}\n"),
    )
    .map_err(|error| LauncherError::technical("Não foi possível gravar .env.portable", error))
}

fn auth_secret() -> LauncherResult<String> {
    let path = paths::mg_pocket_config_dir()?.join("auth-secret.txt");
    if let Ok(existing) = fs::read_to_string(&path) {
        let secret = existing.trim();
        if !secret.is_empty() {
            return Ok(secret.to_string());
        }
    }

    let secret = generate_secret()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de configuração", error)
        })?;
    }
    fs::write(&path, format!("{secret}\n")).map_err(|error| {
        LauncherError::technical(
            "Não foi possível gravar segredo do NextAuth portátil",
            error,
        )
    })?;
    Ok(secret)
}

fn generate_secret() -> LauncherResult<String> {
    let mut bytes = [0_u8; 32];
    getrandom::getrandom(&mut bytes).map_err(|error| {
        LauncherError::technical("Não foi possível gerar segredo seguro do NextAuth", error)
    })?;
    Ok(hex_encode(&bytes))
}

fn hex_encode(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(HEX[(byte >> 4) as usize] as char);
        output.push(HEX[(byte & 0x0f) as usize] as char);
    }
    output
}

fn escape_env_value(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn portable_next_env_contains_required_keys() {
        assert_eq!(
            NEXT_ENV_KEYS,
            [
                "DATABASE_URL",
                "DIRECT_URL",
                "NEXTAUTH_SECRET",
                "NEXTAUTH_URL",
                "NEXT_PUBLIC_BASE_URL",
                "PORT",
                "HOSTNAME",
                "STORAGE_DRIVER",
                "STORAGE_BUCKET",
                "STORAGE_LOCAL_DIR",
                "STORAGE_LOCAL_PUBLIC_URL",
                "NEXT_PUBLIC_STORAGE_MAX_FILE_SIZE_MB",
            ]
        );
    }

    #[test]
    fn generated_secret_is_hex_encoded_32_bytes() {
        let secret = generate_secret().expect("secret should be generated");
        assert_eq!(secret.len(), 64);
        assert!(secret.chars().all(|ch| ch.is_ascii_hexdigit()));
    }
}
