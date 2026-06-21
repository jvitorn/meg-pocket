use std::{
    cmp::Ordering,
    env, fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    time::{Duration, Instant},
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

const DOWNLOAD_CHUNK: usize = 64 * 1024;
const EMIT_INTERVAL_MS: u64 = 250;
const EXTRACTION_EMIT_INTERVAL_MS: u64 = 300;

pub fn install_or_repair_runtime(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    if !cfg!(target_os = "windows") {
        return Err(LauncherError::friendly(
            "O modo portátil é destinado ao Windows. No Linux, use o modo Docker.",
        ));
    }

    install::ensure_layout()?;
    ctx.progress(
        "Baixando arquivos necessários",
        "Buscando informações da versão do runtime portátil.",
        12,
    );
    let manifest = load_manifest(ctx)?;
    let asset = &manifest.windows.x64;
    let zip_path = paths::mg_pocket_downloads_dir()?.join(&asset.file);

    let cache_valid = zip_cache_valid(&zip_path, &asset.sha256, asset.size_bytes);
    if cache_valid {
        ctx.progress(
            "Validando download",
            "Usando versão já baixada anteriormente.",
            28,
        );
        ctx.log(
            "Baixando arquivos necessários",
            &format!("ZIP em cache e válido: {}", zip_path.display()),
            "info",
        );
    } else {
        for attempt in 1..=2 {
            ctx.progress(
                "Baixando arquivos necessários",
                &format!("Baixando runtime portátil (tentativa {attempt}/2)."),
                14,
            );
            download_url_to_file(ctx, &asset.url, &zip_path, asset.size_bytes, true)?;
            ctx.progress(
                "Validando download",
                "Verificando integridade do pacote baixado.",
                29,
            );
            if validate_sha256(&zip_path, &asset.sha256)? {
                break;
            }
            if attempt == 2 {
                let _ = fs::remove_file(&zip_path);
                return Err(LauncherError::integrity(
                    "O download do runtime portátil falhou na verificação de integridade.",
                    "SHA-256 não conferiu após 2 tentativas.",
                ));
            }
            let _ = fs::remove_file(&zip_path);
        }
    }

    ctx.progress("Extraindo runtime", "Extraindo arquivos do sistema.", 32);
    let extracted = extract_zip(ctx, &zip_path)?;
    install::validate_runtime_root(&extracted)?;

    ctx.progress(
        "Instalando runtime",
        "Instalando a nova versão sem apagar seus dados.",
        34,
    );
    replace_runtime_files(&extracted)?;
    cleanup_staging(&extracted);
    install::configure_runtime(&manifest.version, &manifest.runtime_version)?;
    Ok(())
}

fn zip_cache_valid(zip_path: &Path, expected_sha256: &str, expected_size: Option<u64>) -> bool {
    if !zip_path.is_file() {
        return false;
    }
    if let Some(size) = expected_size {
        if fs::metadata(zip_path).map(|m| m.len()).unwrap_or(0) != size {
            return false;
        }
    }
    validate_sha256(zip_path, expected_sha256).unwrap_or(false)
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
    download_url_to_file(ctx, &url, &manifest_path, None, false).map_err(|error| {
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
        "Consultando versões disponíveis do runtime portátil.",
        13,
    );
    download_url_to_file(ctx, &url, &releases_path, None, false).map_err(|error| {
        LauncherError::new(
            "Não foi possível consultar as versões do runtime portátil.",
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

/// Downloads `url` to `destination` using native Rust HTTP with streaming progress.
///
/// When `show_progress` is false (e.g. manifest/releases JSON), the download
/// is silent and uses a short timeout.
fn download_url_to_file(
    ctx: &mut PortableJob<'_, '_>,
    url: &str,
    destination: &Path,
    expected_size: Option<u64>,
    show_progress: bool,
) -> LauncherResult<()> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de downloads", error)
        })?;
    }

    let partial = destination.with_extension(format!(
        "{}.partial",
        destination
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("tmp")
    ));

    let connect_timeout = Duration::from_secs(30);
    let read_timeout = if show_progress {
        Duration::from_secs(20 * 60)
    } else {
        Duration::from_secs(60)
    };

    let agent = ureq::AgentBuilder::new()
        .user_agent("mg-pocket-launcher/1.0")
        .timeout_connect(connect_timeout)
        .timeout_read(read_timeout)
        .build();

    let response = agent.get(url).call().map_err(|e| {
        LauncherError::download(
            "Não foi possível conectar ao servidor para download. Verifique sua conexão.",
            format!("GET {url}: {e}"),
        )
    })?;

    let total_bytes = response
        .header("Content-Length")
        .and_then(|v| v.parse::<u64>().ok())
        .or(expected_size);

    let mut reader = response.into_reader();
    let mut file = fs::File::create(&partial).map_err(|e| {
        LauncherError::download(
            "Não foi possível criar arquivo temporário de download.",
            format!("{}: {e}", partial.display()),
        )
    })?;

    let mut buffer = [0u8; DOWNLOAD_CHUNK];
    let mut transferred: u64 = 0;
    let started = Instant::now();
    let mut last_emit = Instant::now();
    let mut speed_ema: f64 = 0.0;
    let mut last_speed_bytes: u64 = 0;
    let mut last_speed_check = Instant::now();

    loop {
        if ctx.is_cancelled() {
            drop(file);
            let _ = fs::remove_file(&partial);
            return Err(LauncherError::cancelled("Operação cancelada."));
        }

        let n = match reader.read(&mut buffer) {
            Ok(0) => break,
            Ok(n) => n,
            Err(e) => {
                drop(file);
                let _ = fs::remove_file(&partial);
                return Err(LauncherError::download(
                    "A conexão foi interrompida durante o download. Tente novamente.",
                    format!("Erro de leitura: {e}"),
                ));
            }
        };

        if let Err(e) = file.write_all(&buffer[..n]) {
            drop(file);
            let _ = fs::remove_file(&partial);
            return Err(LauncherError::download(
                "Não foi possível gravar o arquivo de download.",
                format!("Erro de escrita: {e}"),
            ));
        }

        transferred += n as u64;

        let speed_elapsed = last_speed_check.elapsed().as_secs_f64();
        if speed_elapsed >= 1.0 {
            let instant_speed = (transferred - last_speed_bytes) as f64 / speed_elapsed;
            speed_ema = if speed_ema < 1.0 {
                instant_speed
            } else {
                speed_ema * 0.7 + instant_speed * 0.3
            };
            last_speed_bytes = transferred;
            last_speed_check = Instant::now();
        }

        if show_progress && last_emit.elapsed() >= Duration::from_millis(EMIT_INTERVAL_MS) {
            let elapsed = started.elapsed().as_secs();
            let speed = if speed_ema >= 1.0 {
                Some(speed_ema as u64)
            } else {
                None
            };
            let progress = download_global_progress(transferred, total_bytes);
            let message = format_download_progress(transferred, total_bytes, speed);
            ctx.progress_download(
                "Baixando arquivos necessários",
                &message,
                progress,
                transferred,
                total_bytes,
                speed,
                elapsed,
            );
            last_emit = Instant::now();
        }
    }

    drop(file);

    if let Some(expected) = total_bytes {
        if transferred < expected {
            let _ = fs::remove_file(&partial);
            return Err(LauncherError::download(
                "O download foi interrompido antes de terminar. Tente novamente.",
                format!("Tamanho esperado: {expected} bytes. Recebido: {transferred} bytes."),
            ));
        }
    }

    fs::rename(&partial, destination).map_err(|e| {
        let _ = fs::remove_file(&partial);
        LauncherError::download(
            "Não foi possível finalizar o arquivo de download.",
            format!("Rename de {:?} para {:?}: {e}", partial, destination),
        )
    })
}

fn download_global_progress(transferred: u64, total: Option<u64>) -> u8 {
    const START: u8 = 8;
    const END: u8 = 34;
    let range = (END - START) as f64;
    if let Some(total) = total {
        if total > 0 {
            let frac = (transferred as f64 / total as f64).min(1.0);
            return START + (frac * range) as u8;
        }
    }
    22
}

fn format_download_progress(transferred: u64, total: Option<u64>, speed: Option<u64>) -> String {
    let speed_str = speed
        .filter(|&s| s > 0)
        .map(|s| format!(" — {:.1} MB/s", s as f64 / 1_048_576.0))
        .unwrap_or_default();

    if let Some(total) = total {
        format!(
            "{:.0} MB de {:.0} MB{}",
            transferred as f64 / 1_048_576.0,
            total as f64 / 1_048_576.0,
            speed_str
        )
    } else {
        format!(
            "{:.0} MB baixados{}",
            transferred as f64 / 1_048_576.0,
            speed_str
        )
    }
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
        fs::remove_dir_all(&tmp)
            .map_err(|e| LauncherError::technical("Não foi possível limpar tmp portátil", e))?;
    }
    fs::create_dir_all(&tmp)
        .map_err(|e| LauncherError::technical("Não foi possível criar tmp portátil", e))?;

    let result = extract_zip_native(ctx, zip_path, &tmp);
    if result.is_err() && !ctx.is_cancelled() {
        cleanup_staging(&tmp);
    }
    result
}

fn extract_zip_native(
    ctx: &mut PortableJob<'_, '_>,
    zip_path: &Path,
    dest_root: &Path,
) -> LauncherResult<PathBuf> {
    let file = fs::File::open(zip_path).map_err(|e| {
        LauncherError::extraction(
            "Não foi possível abrir o arquivo de instalação.",
            format!("{}: {e}", zip_path.display()),
        )
    })?;

    let mut archive = zip::ZipArchive::new(file).map_err(|e| {
        LauncherError::extraction(
            "O arquivo de instalação está corrompido ou em formato inválido.",
            format!("ZipArchive::new: {e}"),
        )
    })?;

    let total_files = archive.len() as u64;
    ctx.progress(
        "Extraindo runtime",
        &format!("Extraindo {total_files} arquivos. O Windows pode verificar os arquivos durante essa etapa."),
        32,
    );

    let started = Instant::now();
    let mut last_emit = Instant::now();

    for i in 0..archive.len() {
        if ctx.is_cancelled() {
            return Err(LauncherError::cancelled("Operação cancelada."));
        }

        let mut entry = archive.by_index(i).map_err(|e| {
            LauncherError::extraction(
                "Não foi possível ler o arquivo de instalação.",
                format!("Entrada {i}: {e}"),
            )
        })?;

        let entry_path = entry.enclosed_name().ok_or_else(|| {
            LauncherError::extraction(
                "O arquivo de instalação contém um caminho inválido.",
                format!("Entrada inválida (Zip Slip): {:?}", entry.name()),
            )
        })?;

        let dest = dest_root.join(&entry_path);

        if !dest.starts_with(dest_root) {
            return Err(LauncherError::extraction(
                "O arquivo de instalação contém caminhos que violam a segurança do sistema.",
                format!("Zip Slip detectado: {:?}", entry.name()),
            ));
        }

        if entry.is_dir() {
            fs::create_dir_all(&dest).map_err(|e| {
                LauncherError::extraction(
                    "Não foi possível criar pasta durante a extração.",
                    format!("{}: {e}", dest.display()),
                )
            })?;
        } else {
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(|e| {
                    LauncherError::extraction(
                        "Não foi possível criar pasta durante a extração.",
                        format!("{}: {e}", parent.display()),
                    )
                })?;
            }
            let mut out = fs::File::create(&dest).map_err(|e| {
                LauncherError::extraction(
                    "Não foi possível criar arquivo durante a extração.",
                    format!("{}: {e}", dest.display()),
                )
            })?;
            std::io::copy(&mut entry, &mut out).map_err(|e| {
                LauncherError::extraction(
                    "Não foi possível extrair arquivo.",
                    format!("{}: {e}", dest.display()),
                )
            })?;
        }

        if last_emit.elapsed() >= Duration::from_millis(EXTRACTION_EMIT_INTERVAL_MS) {
            let processed = (i + 1) as u64;
            let elapsed = started.elapsed().as_secs();
            let progress = extraction_global_progress(processed, total_files);
            let message = format!("{processed} de {total_files} arquivos");
            ctx.progress_extraction(
                "Extraindo runtime",
                &message,
                progress,
                processed,
                total_files,
                elapsed,
            );
            last_emit = Instant::now();
        }
    }

    detect_runtime_root(dest_root)
}

fn extraction_global_progress(processed: u64, total: u64) -> u8 {
    const START: u8 = 35;
    const END: u8 = 68;
    if total == 0 {
        return START;
    }
    let frac = (processed as f64 / total as f64).min(1.0);
    START + ((END - START) as f64 * frac) as u8
}

fn detect_runtime_root(dest_root: &Path) -> LauncherResult<PathBuf> {
    if dest_root.join("runtime").is_dir() {
        return Ok(dest_root.to_path_buf());
    }
    let entries = fs::read_dir(dest_root)
        .map_err(|e| {
            LauncherError::extraction("Não foi possível ler runtime extraído.", format!("{e}"))
        })?
        .flatten()
        .filter(|e| e.path().is_dir())
        .collect::<Vec<_>>();
    if entries.len() == 1 {
        Ok(entries[0].path())
    } else {
        Err(LauncherError::extraction(
            "O pacote portátil extraído não tem a estrutura esperada.",
            format!("Entradas na raiz do ZIP: {}", entries.len()),
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
                LauncherError::installation(
                    format!("Não foi possível atualizar os arquivos do sistema ({name})."),
                    format!("remove_dir_all {}: {error}", destination.display()),
                )
            })?;
        }
        copy_dir_all(&source, &destination)?;
    }
    Ok(())
}

fn copy_dir_all(source: &Path, destination: &Path) -> LauncherResult<()> {
    fs::create_dir_all(destination)
        .map_err(|e| LauncherError::technical("Não foi possível criar destino", e))?;
    for entry in fs::read_dir(source)
        .map_err(|e| LauncherError::technical("Não foi possível ler pasta de origem", e))?
    {
        let entry = entry.map_err(|e| LauncherError::technical("Não foi possível ler item", e))?;
        let source_path = entry.path();
        let target_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_all(&source_path, &target_path)?;
        } else {
            fs::copy(&source_path, &target_path)
                .map(|_| ())
                .map_err(|e| LauncherError::technical("Não foi possível copiar arquivo", e))?;
        }
    }
    Ok(())
}

fn cleanup_staging(staging: &Path) {
    if staging.exists() {
        let _ = fs::remove_dir_all(staging);
    }
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

    #[test]
    fn download_progress_stays_in_global_range() {
        assert!(download_global_progress(0, Some(100)) >= 8);
        assert!(download_global_progress(50, Some(100)) <= 34);
        assert!(download_global_progress(100, Some(100)) <= 34);
        assert!(download_global_progress(0, None) >= 8);
    }

    #[test]
    fn extraction_progress_stays_in_global_range() {
        assert!(extraction_global_progress(0, 100) >= 35);
        assert!(extraction_global_progress(50, 100) <= 68);
        assert!(extraction_global_progress(100, 100) <= 68);
    }

    #[test]
    fn zip_cache_valid_returns_false_for_missing_file() {
        assert!(!zip_cache_valid(
            Path::new("/nao-existe/arquivo.zip"),
            "abc",
            None
        ));
    }

    #[test]
    fn enclosed_name_returns_none_for_zip_slip_paths() {
        // Build a ZIP in memory with a traversal path and verify that
        // enclosed_name() — which our extraction code relies on — returns None.
        let cursor = std::io::Cursor::new(Vec::new());
        let mut w = zip::ZipWriter::new(cursor);
        let opts = zip::write::SimpleFileOptions::default();
        if w.start_file("../escape.txt", opts).is_ok() {
            let _ = w.write_all(b"escaped");
            let cursor = w.finish().expect("zip finish");
            let data = cursor.into_inner();
            let reader = std::io::Cursor::new(data);
            let mut archive = zip::ZipArchive::new(reader).expect("valid zip archive");
            let entry = archive.by_index(0).expect("first entry");
            assert!(
                entry.enclosed_name().is_none(),
                "enclosed_name() must return None for '..' traversal paths"
            );
        }
        // If start_file rejected the path, the zip crate already prevents Zip Slip at write time.
    }

    #[test]
    fn format_download_progress_shows_mb_and_speed() {
        let msg = format_download_progress(
            50 * 1024 * 1024,
            Some(200 * 1024 * 1024),
            Some(5 * 1024 * 1024),
        );
        assert!(msg.contains("50"), "should contain transferred MB");
        assert!(msg.contains("200"), "should contain total MB");
        assert!(msg.contains("MB/s"), "should contain speed");
    }
}
