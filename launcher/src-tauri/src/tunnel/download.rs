use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    tunnel::types::InstalledCloudflared,
};

const CLOUDFLARED_VERSION: &str = "2026.6.1";
const GITHUB_RELEASE_BASE: &str =
    "https://github.com/cloudflare/cloudflared/releases/download/2026.6.1";

#[derive(Clone, Copy)]
struct CloudflaredAsset {
    file_name: &'static str,
    sha256: &'static str,
    executable_name: &'static str,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct CloudflaredMetadata {
    version: String,
    file_name: String,
    sha256: String,
    installed_at: String,
}

pub fn ensure_cloudflared() -> LauncherResult<InstalledCloudflared> {
    let asset = asset_for_current_platform()?;
    let install_dir = cloudflared_dir()?;
    fs::create_dir_all(&install_dir).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta do compartilhamento", error)
    })?;
    let binary_path = install_dir.join(asset.executable_name);

    if binary_path.is_file() {
        let current_hash = sha256_file(&binary_path)?;
        if current_hash == asset.sha256 {
            write_metadata(&install_dir, asset)?;
            return Ok(InstalledCloudflared {
                path: binary_path,
                version: CLOUDFLARED_VERSION.to_string(),
                sha256: current_hash,
            });
        }
    }

    download_and_install(asset, &binary_path)?;
    Ok(InstalledCloudflared {
        path: binary_path,
        version: CLOUDFLARED_VERSION.to_string(),
        sha256: asset.sha256.to_string(),
    })
}

pub fn cloudflared_dir() -> LauncherResult<PathBuf> {
    Ok(paths::mg_pocket_runtime_dir()?.join("cloudflared"))
}

fn asset_for_current_platform() -> LauncherResult<CloudflaredAsset> {
    let arch = std::env::consts::ARCH;
    if cfg!(target_os = "windows") && arch == "x86_64" {
        return Ok(CloudflaredAsset {
            file_name: "cloudflared-windows-amd64.exe",
            sha256: "5253e66f1f493c4e13539749f1aa86fd0c61e3072900fec29a44ba046a6d97e2",
            executable_name: "cloudflared.exe",
        });
    }
    if cfg!(target_os = "linux") && arch == "x86_64" {
        return Ok(CloudflaredAsset {
            file_name: "cloudflared-linux-amd64",
            sha256: "5861a10a438fe8ddcfebb3b830f83966cbf193edafce0fe2eeb198fbae1f7a22",
            executable_name: "cloudflared",
        });
    }
    if cfg!(target_os = "linux") && arch == "aarch64" {
        return Ok(CloudflaredAsset {
            file_name: "cloudflared-linux-arm64",
            sha256: "59816ce9b16db71f5bc2a86d59b3632a96c8c3ee934bde2bc8641ee83a6070eb",
            executable_name: "cloudflared",
        });
    }
    Err(LauncherError::friendly(
        "O compartilhamento temporário ainda não está disponível para este sistema.",
    ))
}

fn download_and_install(asset: CloudflaredAsset, binary_path: &Path) -> LauncherResult<()> {
    let install_dir = binary_path.parent().ok_or_else(|| {
        LauncherError::friendly("Não foi possível preparar a pasta do compartilhamento.")
    })?;
    fs::create_dir_all(install_dir).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta do compartilhamento", error)
    })?;
    let tmp_path = install_dir.join(format!("{}.download", asset.executable_name));
    let _ = fs::remove_file(&tmp_path);

    let url = format!("{GITHUB_RELEASE_BASE}/{}", asset.file_name);
    let response = ureq::get(&url)
        .call()
        .map_err(|error| {
            LauncherError::download(
                "O servidor continua disponível neste computador, mas não foi possível preparar o compartilhamento temporário.",
                format!("Falha ao baixar cloudflared de {url}: {error}"),
            )
        })?;
    let mut reader = response.into_reader();
    let mut file = fs::File::create(&tmp_path).map_err(|error| {
        LauncherError::technical("Não foi possível criar download temporário", error)
    })?;
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let bytes = reader.read(&mut buffer).map_err(|error| {
            LauncherError::download(
                "O servidor continua disponível neste computador, mas não foi possível preparar o compartilhamento temporário.",
                format!("Falha ao ler download de cloudflared: {error}"),
            )
        })?;
        if bytes == 0 {
            break;
        }
        file.write_all(&buffer[..bytes]).map_err(|error| {
            LauncherError::technical("Não foi possível gravar download temporário", error)
        })?;
    }
    drop(file);

    let downloaded_hash = sha256_file(&tmp_path)?;
    if downloaded_hash != asset.sha256 {
        let _ = fs::remove_file(&tmp_path);
        return Err(LauncherError::integrity(
            "O servidor continua disponível neste computador, mas não foi possível preparar o compartilhamento temporário.",
            format!(
                "Hash inválido para {}. Esperado {}, recebido {}.",
                asset.file_name, asset.sha256, downloaded_hash
            ),
        ));
    }

    #[cfg(unix)]
    {
        let mut permissions = fs::metadata(&tmp_path)
            .map_err(|error| LauncherError::technical("Não foi possível ler permissões", error))?
            .permissions();
        permissions.set_mode(0o755);
        fs::set_permissions(&tmp_path, permissions).map_err(|error| {
            LauncherError::technical("Não foi possível marcar cloudflared como executável", error)
        })?;
    }

    if binary_path.exists() {
        fs::remove_file(binary_path).map_err(|error| {
            LauncherError::technical("Não foi possível substituir cloudflared antigo", error)
        })?;
    }
    fs::rename(&tmp_path, binary_path).map_err(|error| {
        LauncherError::technical("Não foi possível instalar cloudflared validado", error)
    })?;
    write_metadata(install_dir, asset)
}

fn write_metadata(install_dir: &Path, asset: CloudflaredAsset) -> LauncherResult<()> {
    let metadata = CloudflaredMetadata {
        version: CLOUDFLARED_VERSION.to_string(),
        file_name: asset.file_name.to_string(),
        sha256: asset.sha256.to_string(),
        installed_at: super::types::unix_timestamp_string(),
    };
    fs::write(
        install_dir.join("version.json"),
        serde_json::to_string_pretty(&metadata).unwrap_or_else(|_| "{}".to_string()),
    )
    .map_err(|error| {
        LauncherError::technical("Não foi possível registrar versão do cloudflared", error)
    })
}

fn sha256_file(path: &Path) -> LauncherResult<String> {
    let mut file = fs::File::open(path)
        .map_err(|error| LauncherError::technical("Não foi possível ler arquivo baixado", error))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let bytes = file.read(&mut buffer).map_err(|error| {
            LauncherError::technical("Não foi possível calcular SHA-256", error)
        })?;
        if bytes == 0 {
            break;
        }
        hasher.update(&buffer[..bytes]);
    }
    Ok(to_hex(&hasher.finalize()))
}

fn to_hex(bytes: &[u8]) -> String {
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push_str(&format!("{byte:02x}"));
    }
    output
}
