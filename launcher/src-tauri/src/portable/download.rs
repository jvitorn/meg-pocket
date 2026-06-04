use std::{
    env, fs,
    io::Read,
    path::{Path, PathBuf},
    process::Command,
    time::Duration,
};

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
const PORTABLE_RUNTIME_RELEASES_BASE_URL: &str = "https://github.com/jvitorn/meg-pocket/releases/download";

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
        15,
    );
    let manifest = load_manifest(ctx)?;
    let asset = &manifest.windows.x64;
    let zip_path = paths::mg_pocket_downloads_dir()?.join(&asset.file);

    for attempt in 1..=2 {
        ctx.progress(
            "Baixando arquivos necessários",
            &format!("Baixando runtime portátil ({attempt}/2)."),
            30,
        );
        download_url_to_file(ctx, &asset.url, &zip_path)?;
        ctx.progress(
            "Validando download",
            "Calculando SHA-256 do pacote baixado.",
            55,
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

    ctx.progress("Extraindo runtime", "Extraindo pacote portátil.", 65);
    let extracted = extract_zip(ctx, &zip_path)?;
    install::validate_runtime_root(&extracted)?;

    ctx.progress(
        "Instalando runtime",
        "Substituindo arquivos do aplicativo sem apagar dados locais.",
        75,
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

    let url = env::var("MG_POCKET_PORTABLE_MANIFEST_URL").unwrap_or_else(|_| default_manifest_url());
    let manifest_path = paths::mg_pocket_downloads_dir()?.join("portable-manifest.json");
    download_url_to_file(ctx, &url, &manifest_path).map_err(|error| {
        LauncherError::new(
            "Runtime portátil ainda não está publicado.",
            error.technical_message().to_string(),
        )
    })?;
    let text = fs::read_to_string(manifest_path)
        .map_err(|error| LauncherError::technical("Não foi possível ler manifest portátil", error))?;
    parse_manifest(&text)
}

fn parse_manifest(text: &str) -> LauncherResult<PortableManifest> {
    let manifest = serde_json::from_str::<PortableManifest>(text)
        .map_err(|error| LauncherError::technical("Manifest portátil inválido", error))?;
    validate_asset(&manifest.windows.x64)?;
    Ok(manifest)
}

fn default_manifest_url() -> String {
    format!(
        "{}/{PORTABLE_RUNTIME_RELEASE_PREFIX}-v{}/portable-manifest.json",
        PORTABLE_RUNTIME_RELEASES_BASE_URL,
        paths::launcher_version()
    )
}

fn validate_asset(asset: &ManifestAsset) -> LauncherResult<()> {
    if asset.url.trim().is_empty() || asset.sha256.trim().is_empty() || asset.file.trim().is_empty() {
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

fn download_url_to_file(ctx: &mut PortableJob<'_, '_>, url: &str, destination: &Path) -> LauncherResult<()> {
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
                "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '{}' -OutFile '{}'",
                powershell_escape(url),
                powershell_escape_path(destination)
            ),
        ]);
        command
    } else {
        let mut command = Command::new("curl");
        command.args(["-fL", url, "-o"]);
        command.arg(destination);
        command
    };
    super::run_command(ctx, "Baixando arquivos necessários", "Baixando arquivo.", 40, &mut command, Duration::from_secs(20 * 60)).map(|_| ())
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
            .map_err(|error| LauncherError::technical("Não foi possível limpar tmp portátil", error))?;
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
    super::run_command(ctx, "Extraindo runtime", "Extraindo pacote.", 65, &mut command, Duration::from_secs(5 * 60))?;

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
        let entry = entry.map_err(|error| LauncherError::technical("Não foi possível ler item", error))?;
        let source_path = entry.path();
        let target_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_all(&source_path, &target_path)?;
        } else {
            fs::copy(&source_path, &target_path)
                .map(|_| ())
                .map_err(|error| LauncherError::technical("Não foi possível copiar arquivo", error))?;
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
