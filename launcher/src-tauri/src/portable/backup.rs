use std::{fs, path::PathBuf, process::Command, time::Duration};

use serde_json::json;

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{install, process, types::unix_timestamp_string, PortableJob},
};

pub fn backup(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<PathBuf> {
    let config = install::read_or_create_runtime_config()?;
    let staging = paths::mg_pocket_tmp_dir()?.join(format!("backup-{}", std::process::id()));
    if staging.exists() {
        fs::remove_dir_all(&staging).map_err(|error| {
            LauncherError::technical("Não foi possível limpar backup temporário", error)
        })?;
    }
    fs::create_dir_all(staging.join("database")).map_err(|error| {
        LauncherError::technical("Não foi possível criar backup temporário", error)
    })?;

    let dump = staging.join("database/meg-pocket.dump");
    let mut pg_dump =
        Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_dump.exe"));
    pg_dump
        .args([
            "-h",
            "127.0.0.1",
            "-U",
            "meg",
            "-d",
            "meg_pocket",
            "-Fc",
            "-f",
        ])
        .arg(&dump)
        .arg("-p")
        .arg(config.postgres_port.to_string());
    super::run_command(
        ctx,
        "Backup",
        "Exportando banco local.",
        35,
        &mut pg_dump,
        Duration::from_secs(10 * 60),
    )?;

    let uploads = paths::mg_pocket_data_content_dir()?.join("uploads");
    if uploads.is_dir() {
        copy_dir_all(&uploads, &staging.join("uploads"))?;
    }
    fs::write(
        staging.join("backup.json"),
        serde_json::to_string_pretty(&json!({
            "app": "meg-pocket",
            "backupVersion": 1,
            "createdAt": unix_timestamp_string(),
            "runtimeMode": "portable",
            "database": { "type": "postgresql", "format": "dump" },
            "includes": { "database": true, "uploads": uploads.is_dir() }
        }))
        .unwrap_or_else(|_| "{}".to_string()),
    )
    .map_err(|error| LauncherError::technical("Não foi possível escrever backup.json", error))?;

    let destination = paths::mg_pocket_backups_dir()?.join(format!(
        "meg-pocket-portable-{}.zip",
        unix_timestamp_string()
    ));
    compress_dir(ctx, &staging, &destination)?;
    Ok(destination)
}

pub fn restore(ctx: &mut PortableJob<'_, '_>, backup_path: PathBuf) -> LauncherResult<()> {
    if !backup_path.is_file() {
        return Err(LauncherError::friendly("Backup não encontrado."));
    }
    ctx.log(
        "Backup automático",
        "Criando cópia de segurança antes de restaurar.",
        "info",
    );
    let _ = backup(ctx);
    let _ = process::stop(ctx);

    let staging = paths::mg_pocket_tmp_dir()?.join(format!("restore-{}", std::process::id()));
    if staging.exists() {
        fs::remove_dir_all(&staging).map_err(|error| {
            LauncherError::technical("Não foi possível limpar restore temporário", error)
        })?;
    }
    fs::create_dir_all(&staging).map_err(|error| {
        LauncherError::technical("Não foi possível criar restore temporário", error)
    })?;
    expand_zip(ctx, &backup_path, &staging)?;
    if !staging.join("backup.json").is_file() || !staging.join("database/meg-pocket.dump").is_file()
    {
        return Err(LauncherError::friendly("Backup portátil inválido."));
    }

    let config = install::read_or_create_runtime_config()?;
    let _ = process::start(ctx);
    let mut pg_restore =
        Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_restore.exe"));
    pg_restore
        .args([
            "-h",
            "127.0.0.1",
            "-U",
            "meg",
            "-d",
            "meg_pocket",
            "--clean",
            "--if-exists",
            "--no-owner",
        ])
        .arg("-p")
        .arg(config.postgres_port.to_string())
        .arg(staging.join("database/meg-pocket.dump"));
    super::run_command(
        ctx,
        "Restaurar backup",
        "Restaurando banco local.",
        60,
        &mut pg_restore,
        Duration::from_secs(10 * 60),
    )?;

    let uploads = staging.join("uploads");
    if uploads.is_dir() {
        let destination = paths::mg_pocket_data_content_dir()?.join("uploads");
        if destination.exists() {
            fs::remove_dir_all(&destination).map_err(|error| {
                LauncherError::technical("Não foi possível substituir uploads", error)
            })?;
        }
        copy_dir_all(&uploads, &destination)?;
    }
    let _ = process::restart(ctx)?;
    Ok(())
}

fn compress_dir(
    ctx: &mut PortableJob<'_, '_>,
    source: &PathBuf,
    destination: &PathBuf,
) -> LauncherResult<()> {
    if cfg!(target_os = "windows") {
        let mut command = Command::new("powershell.exe");
        command.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &format!(
                "Compress-Archive -Path '{}\\*' -DestinationPath '{}' -Force",
                source.to_string_lossy().replace('\'', "''"),
                destination.to_string_lossy().replace('\'', "''")
            ),
        ]);
        super::run_command(
            ctx,
            "Backup",
            "Compactando backup.",
            80,
            &mut command,
            Duration::from_secs(5 * 60),
        )
        .map(|_| ())
    } else {
        Err(LauncherError::friendly(
            "Backup portátil em ZIP é suportado no Windows.",
        ))
    }
}

fn expand_zip(
    ctx: &mut PortableJob<'_, '_>,
    source: &PathBuf,
    destination: &PathBuf,
) -> LauncherResult<()> {
    if cfg!(target_os = "windows") {
        let mut command = Command::new("powershell.exe");
        command.args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &format!(
                "Expand-Archive -LiteralPath '{}' -DestinationPath '{}' -Force",
                source.to_string_lossy().replace('\'', "''"),
                destination.to_string_lossy().replace('\'', "''")
            ),
        ]);
        super::run_command(
            ctx,
            "Restaurar backup",
            "Extraindo backup.",
            25,
            &mut command,
            Duration::from_secs(5 * 60),
        )
        .map(|_| ())
    } else {
        Err(LauncherError::friendly(
            "Restore portátil em ZIP é suportado no Windows.",
        ))
    }
}

fn copy_dir_all(source: &PathBuf, destination: &PathBuf) -> LauncherResult<()> {
    fs::create_dir_all(destination).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta de destino", error)
    })?;
    for entry in fs::read_dir(source)
        .map_err(|error| LauncherError::technical("Não foi possível ler pasta de origem", error))?
    {
        let entry = entry
            .map_err(|error| LauncherError::technical("Não foi possível ler arquivo", error))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_all(&source_path, &destination_path)?;
        } else {
            fs::copy(&source_path, &destination_path)
                .map(|_| ())
                .map_err(|error| {
                    LauncherError::technical("Não foi possível copiar arquivo", error)
                })?;
        }
    }
    Ok(())
}
