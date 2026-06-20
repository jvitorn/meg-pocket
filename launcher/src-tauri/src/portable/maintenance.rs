use std::fs;

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{backup, process, PortableJob},
};

const LOG_LIMIT_BYTES: usize = 512 * 1024;

pub fn read_logs() -> LauncherResult<String> {
    let logs_dir = paths::mg_pocket_logs_dir()?;
    let mut output = String::new();
    for name in [
        "launcher.log",
        "app.log",
        "postgres.log",
        "postgres-control.log",
        "nginx-launcher.log",
        "nginx-access.log",
        "nginx-error.log",
    ] {
        let path = logs_dir.join(name);
        if !path.is_file() {
            continue;
        }
        let text = fs::read_to_string(&path).unwrap_or_default();
        output.push_str(&format!("# {name}\n{}\n\n", tail_bytes(&text, LOG_LIMIT_BYTES)));
    }
    if output.trim().is_empty() {
        Ok("Nenhum log portátil encontrado ainda.".to_string())
    } else {
        Ok(output)
    }
}

pub fn reset_local_data(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    ctx.log(
        "Backup automático",
        "Tentando criar backup antes do reset portátil.",
        "info",
    );
    let _ = backup::backup(ctx);
    let _ = process::stop(ctx);
    let data_dir = paths::mg_pocket_data_content_dir()?;
    for critical in ["postgres", "uploads"] {
        let path = data_dir.join(critical);
        if path.exists() {
            fs::remove_dir_all(&path).map_err(|error| {
                LauncherError::technical(format!("Não foi possível remover data/{critical}"), error)
            })?;
        }
        fs::create_dir_all(&path).map_err(|error| {
            LauncherError::technical(format!("Não foi possível recriar data/{critical}"), error)
        })?;
    }
    fs::write(data_dir.join("uploads/.meg-pocket-health"), "ok\n")
        .map_err(|error| LauncherError::technical("Não foi possível recriar health de uploads", error))?;
    Ok(())
}

fn tail_bytes(text: &str, limit: usize) -> &str {
    if text.len() <= limit {
        text
    } else {
        text.get(text.len().saturating_sub(limit)..).unwrap_or(text)
    }
}
