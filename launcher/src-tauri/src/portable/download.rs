use std::{
    cmp::Ordering,
    env, fs,
    io::Read,
    path::{Path, PathBuf},
    process::Command,
    time::Duration,
};

use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{
        install,
        types::{ManifestAsset, PortableManifest},
        PortableJob,
    },
};

const PORTABLE_RUNTIME_RELEASE_PREFIX: &str = "portable-runtime";
const PORTABLE_MANIFEST_ASSET: &str = "portable-manifest.json";
const GITHUB_RELEASES_API_URL: &str =
    "https://api.github.com/repos/jvitorn/meg-pocket/releases?per_page=100";

pub fn install_or_repair_runtime(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    if !cfg!(target_os = "windows") {
        return Err(LauncherError::friendly(
            "O modo portátil é destinado ao Windows. No Linux, use o modo Docker.",
        ));
    }

    install::ensure_layout()?;
    ctx.progress(
        "Baixando arquivos necessários",
        "Buscando manifest do runtime portátil.",
        12,
    );
    let manifest = load_manifest(ctx)?;
    let asset = &manifest.windows.x64;
    let zip_path = paths::mg_pocket_downloads_dir()?.join(&asset.file);

    for attempt in 1..=2 {
        ctx.progress(
            "Baixando arquivos necessários",
            &format!("Baixando runtime portátil ({attempt}/2)."),
            22,
        );
        download_url_to_file(ctx, &asset.url, &zip_path)?;
        ctx.progress(
            "Validando download",
            "Calculando SHA-256 do pacote baixado.",
            28,
        );
        if validate_sha256(&zip_path, &asset.sha256)? {
            break;
        }
        if attempt == 2 {
            return Err(LauncherError::friendly(
                "O download do runtime portátil falhou na validação de integridade.",
            ));
        }
        let _ = fs::remove_file(&zip_path);
    }

    ctx.progress("Extraindo runtime", "Extraindo pacote portátil.", 31);
    let extracted = extract_zip(ctx, &zip_path)?;
    install::validate_runtime_root(&extracted)?;

    ctx.progress(
        "Instalando runtime",
        "Substituindo arquivos do aplicativo sem apagar dados locais.",
        34,
    );
    replace_runtime_files(&extracted)?;
    install::configure_runtime(&manifest.version, &manifest.runtime_version)?;
    Ok(())
}

fn load_manifest(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<PortableManifest> {
    if let Ok(path) = env::var("MG_POCKET_PORTABLE_MANIFEST_FILE") {
        let text = fs::read_to_string(path).map_err(|error| {
            LauncherError::technical("Não foi possível ler manifest portátil local", error)
        })?;
        return parse_manifest(&text);
    }

    let url = env::var("MG_POCKET_PORTABLE_MANIFEST_URL")
        .ok()
        .filter(|url| !url.trim().is_empty())
        .map(Ok)
        .unwrap_or_else(|| latest_runtime_manifest_url(ctx))?;
    let manifest_path = paths::mg_pocket_downloads_dir()?.join("portable-manifest.json");
    download_url_to_file(ctx, &url, &manifest_path).map_err(|error| {
        LauncherError::new(
            "Runtime portátil ainda não está publicado.",
            error.technical_message().to_string(),
        )
    })?;
    let text = fs::read_to_string(manifest_path).map_err(|error| {
        LauncherError::technical("Não foi possível ler manifest portátil", error)
    })?;
    parse_manifest(&text)
}

fn latest_runtime_manifest_url(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<String> {
    let url = env::var("MG_POCKET_PORTABLE_RELEASES_URL")
        .ok()
        .filter(|url| !url.trim().is_empty())
        .unwrap_or_else(default_releases_api_url);
    let releases_path = paths::mg_pocket_downloads_dir()?.join("portable-releases.json");

    ctx.progress(
        "Baixando arquivos necessários",
        "Consultando releases do runtime portátil.",
        14,
    );
    download_url_to_file(ctx, &url, &releases_path).map_err(|error| {
        LauncherError::new(
            "Não foi possível consultar as releases do runtime portátil.",
            error.technical_message().to_string(),
        )
    })?;

    let text = fs::read_to_string(releases_path).map_err(|error| {
        LauncherError::technical("Não foi possível ler releases portáteis", error)
    })?;
    resolve_latest_runtime_manifest_url(&text)
}

fn parse_manifest(text: &str) -> LauncherResult<PortableManifest> {
    let manifest = serde_json::from_str::<PortableManifest>(text)
        .map_err(|error| LauncherError::technical("Manifest portátil inválido", error))?;
    validate_asset(&manifest.windows.x64)?;
    Ok(manifest)
}

fn default_releases_api_url() -> String {
    GITHUB_RELEASES_API_URL.to_string()
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    #[serde(default)]
    draft: bool,
    published_at: Option<String>,
    created_at: Option<String>,
    #[serde(default)]
    assets: Vec<GithubReleaseAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubReleaseAsset {
    name: String,
    browser_download_url: String,
}

fn resolve_latest_runtime_manifest_url(text: &str) -> LauncherResult<String> {
    let releases = serde_json::from_str::<Vec<GithubRelease>>(text).map_err(|error| {
        LauncherError::technical("Lista de releases do runtime inválida", error)
    })?;
    let release = latest_runtime_release(&releases).ok_or_else(|| {
        LauncherError::friendly("Não encontrei nenhuma release técnica do runtime portátil.")
    })?;
    let asset = release
        .assets
        .iter()
        .find(|asset| asset.name.eq_ignore_ascii_case(PORTABLE_MANIFEST_ASSET))
        .ok_or_else(|| {
            LauncherError::new(
                format!(
                    "A release {} não contém o manifest do runtime portátil.",
                    release.tag_name
                ),
                format!(
                    "Asset ausente em {}: {}",
                    release.tag_name, PORTABLE_MANIFEST_ASSET
                ),
            )
        })?;

    if asset.browser_download_url.trim().is_empty() {
        return Err(LauncherError::new(
            format!(
                "A release {} contém um manifest portátil sem URL de download.",
                release.tag_name
            ),
            format!("browser_download_url vazio em {}", release.tag_name),
        ));
    }

    Ok(asset.browser_download_url.clone())
}

fn latest_runtime_release(releases: &[GithubRelease]) -> Option<&GithubRelease> {
    releases
        .iter()
        .filter(|release| !release.draft && runtime_release_version(&release.tag_name).is_some())
        .max_by(|left, right| compare_runtime_releases(left, right))
}

fn compare_runtime_releases(left: &GithubRelease, right: &GithubRelease) -> Ordering {
    release_sort_time(left)
        .cmp(release_sort_time(right))
        .then_with(|| {
            runtime_release_version(&left.tag_name).cmp(&runtime_release_version(&right.tag_name))
        })
        .then_with(|| left.tag_name.cmp(&right.tag_name))
}

fn release_sort_time(release: &GithubRelease) -> &str {
    release
        .published_at
        .as_deref()
        .or(release.created_at.as_deref())
        .unwrap_or("")
}

fn runtime_release_version(tag: &str) -> Option<Vec<u64>> {
    let prefix = format!("{PORTABLE_RUNTIME_RELEASE_PREFIX}-v");
    let suffix = tag.strip_prefix(&prefix)?;
    let version = suffix
        .split_once('-')
        .map(|(version, _)| version)
        .unwrap_or(suffix);
    let parts = version
        .split('.')
        .map(|part| {
            if part.is_empty() || !part.chars().all(|ch| ch.is_ascii_digit()) {
                return None;
            }
            part.parse::<u64>().ok()
        })
        .collect::<Option<Vec<_>>>()?;

    if parts.is_empty() {
        None
    } else {
        Some(parts)
    }
}

fn validate_asset(asset: &ManifestAsset) -> LauncherResult<()> {
    if asset.url.trim().is_empty() || asset.sha256.trim().is_empty() || asset.file.trim().is_empty()
    {
        return Err(LauncherError::friendly(
            "Manifest portátil não contém asset Windows x64 válido.",
        ));
    }
    if asset.size_bytes == Some(0) {
        return Err(LauncherError::friendly(
            "Manifest portátil informa tamanho inválido para o runtime Windows x64.",
        ));
    }
    Ok(())
}

fn download_url_to_file(
    ctx: &mut PortableJob<'_, '_>,
    url: &str,
    destination: &Path,
) -> LauncherResult<()> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de downloads", error)
        })?;
    }

    let mut command = if cfg!(target_os = "windows") {
        let mut command = Command::new("powershell.exe");
        command.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &format!(
                "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UserAgent 'mg-pocket-launcher' -Uri '{}' -OutFile '{}'",
                powershell_escape(url),
                powershell_escape_path(destination)
            ),
        ]);
        command
    } else {
        let mut command = Command::new("curl");
        command.args(["-fL", "-A", "mg-pocket-launcher", url, "-o"]);
        command.arg(destination);
        command
    };
    super::run_command(
        ctx,
        "Baixando arquivos necessários",
        "Baixando arquivo.",
        24,
        &mut command,
        Duration::from_secs(20 * 60),
    )
    .map(|_| ())
}

fn validate_sha256(path: &Path, expected: &str) -> LauncherResult<bool> {
    let mut file = fs::File::open(path)
        .map_err(|error| LauncherError::technical("Não foi possível abrir download", error))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let bytes = file
            .read(&mut buffer)
            .map_err(|error| LauncherError::technical("Não foi possível ler download", error))?;
        if bytes == 0 {
            break;
        }
        hasher.update(&buffer[..bytes]);
    }
    let actual = hasher
        .finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    Ok(actual.eq_ignore_ascii_case(expected.trim()))
}

fn extract_zip(ctx: &mut PortableJob<'_, '_>, zip_path: &Path) -> LauncherResult<PathBuf> {
    let tmp = paths::mg_pocket_tmp_dir()?.join(format!("portable-runtime-{}", std::process::id()));
    if tmp.exists() {
        fs::remove_dir_all(&tmp).map_err(|error| {
            LauncherError::technical("Não foi possível limpar tmp portátil", error)
        })?;
    }
    fs::create_dir_all(&tmp)
        .map_err(|error| LauncherError::technical("Não foi possível criar tmp portátil", error))?;

    let mut command = if cfg!(target_os = "windows") {
        let mut command = Command::new("powershell.exe");
        command.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &format!(
                "Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
                powershell_escape_path(zip_path),
                powershell_escape_path(&tmp)
            ),
        ]);
        command
    } else {
        let mut command = Command::new("unzip");
        command.arg("-q").arg(zip_path).arg("-d").arg(&tmp);
        command
    };
    super::run_command(
        ctx,
        "Extraindo runtime",
        "Extraindo pacote.",
        32,
        &mut command,
        Duration::from_secs(5 * 60),
    )?;

    if tmp.join("runtime").is_dir() {
        return Ok(tmp);
    }
    let entries = fs::read_dir(&tmp)
        .map_err(|error| LauncherError::technical("Não foi possível ler runtime extraído", error))?
        .flatten()
        .filter(|entry| entry.path().is_dir())
        .collect::<Vec<_>>();
    if entries.len() == 1 {
        Ok(entries[0].path())
    } else {
        Err(LauncherError::friendly(
            "O pacote portátil extraído não tem a estrutura esperada.",
        ))
    }
}

fn replace_runtime_files(extracted: &Path) -> LauncherResult<()> {
    for name in ["runtime", "app", "prisma", "scripts", "templates"] {
        let source = extracted.join(name);
        if !source.exists() {
            continue;
        }
        let destination = install::portable_root().join(name);
        if destination.exists() {
            fs::remove_dir_all(&destination).map_err(|error| {
                LauncherError::technical(format!("Não foi possível substituir {name}"), error)
            })?;
        }
        copy_dir_all(&source, &destination)?;
    }
    Ok(())
}

fn copy_dir_all(source: &Path, destination: &Path) -> LauncherResult<()> {
    fs::create_dir_all(destination)
        .map_err(|error| LauncherError::technical("Não foi possível criar destino", error))?;
    for entry in fs::read_dir(source)
        .map_err(|error| LauncherError::technical("Não foi possível ler pasta de origem", error))?
    {
        let entry =
            entry.map_err(|error| LauncherError::technical("Não foi possível ler item", error))?;
        let source_path = entry.path();
        let target_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_all(&source_path, &target_path)?;
        } else {
            fs::copy(&source_path, &target_path)
                .map(|_| ())
                .map_err(|error| {
                    LauncherError::technical("Não foi possível copiar arquivo", error)
                })?;
        }
    }
    Ok(())
}

fn powershell_escape(value: &str) -> String {
    value.replace('\'', "''")
}

fn powershell_escape_path(path: &Path) -> String {
    powershell_escape(path.to_string_lossy().as_ref())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_lookup_uses_github_release_list_instead_of_launcher_version_tag() {
        let url = default_releases_api_url();

        assert_eq!(
            url,
            "https://api.github.com/repos/jvitorn/meg-pocket/releases?per_page=100"
        );
        assert!(!url.contains("portable-runtime-v"));
    }

    #[test]
    fn resolves_latest_runtime_manifest_even_when_launcher_release_is_newer() {
        let releases = r#"
[
  {
    "tag_name": "v1.2.1",
    "published_at": "2026-06-08T12:00:00Z",
    "assets": [
      {
        "name": "mg-pocket-launcher_1.2.1_x64-setup.exe",
        "browser_download_url": "https://example.test/launcher.exe"
      }
    ]
  },
  {
    "tag_name": "portable-runtime-v1.0.0",
    "published_at": "2026-05-06T12:00:00Z",
    "assets": [
      {
        "name": "portable-manifest.json",
        "browser_download_url": "https://example.test/runtime/v1.0.0/portable-manifest.json"
      }
    ]
  },
  {
    "tag_name": "portable-runtime-v1.1.0",
    "published_at": "2026-06-04T12:00:00Z",
    "assets": [
      {
        "name": "meg-pocket-portable-runtime-windows-x64-v1.1.0.zip",
        "browser_download_url": "https://example.test/runtime/v1.1.0/runtime.zip"
      },
      {
        "name": "portable-manifest.json",
        "browser_download_url": "https://example.test/runtime/v1.1.0/portable-manifest.json"
      }
    ]
  }
]
"#;

        assert_eq!(
            resolve_latest_runtime_manifest_url(releases).unwrap(),
            "https://example.test/runtime/v1.1.0/portable-manifest.json"
        );
    }

    #[test]
    fn latest_runtime_release_without_manifest_fails_instead_of_installing_older_runtime() {
        let releases = r#"
[
  {
    "tag_name": "portable-runtime-v1.0.0",
    "published_at": "2026-05-06T12:00:00Z",
    "assets": [
      {
        "name": "portable-manifest.json",
        "browser_download_url": "https://example.test/runtime/v1.0.0/portable-manifest.json"
      }
    ]
  },
  {
    "tag_name": "portable-runtime-v1.1.0",
    "published_at": "2026-06-04T12:00:00Z",
    "assets": [
      {
        "name": "meg-pocket-portable-runtime-windows-x64-v1.1.0.zip",
        "browser_download_url": "https://example.test/runtime/v1.1.0/runtime.zip"
      }
    ]
  }
]
"#;

        let error = resolve_latest_runtime_manifest_url(releases).unwrap_err();

        assert!(error.friendly_message().contains("portable-runtime-v1.1.0"));
        assert!(error.technical_message().contains("portable-manifest.json"));
    }
}
