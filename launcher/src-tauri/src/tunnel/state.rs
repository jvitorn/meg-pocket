use std::fs;
use std::path::PathBuf;

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
};

use super::types::TunnelState;

pub fn state_path() -> LauncherResult<PathBuf> {
    Ok(paths::mg_pocket_config_dir()?.join("tunnel.json"))
}

pub fn read_state() -> Option<TunnelState> {
    let path = state_path().ok()?;
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn write_state(state: &TunnelState) -> LauncherResult<()> {
    let path = state_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de configuração", error)
        })?;
    }
    fs::write(
        path,
        serde_json::to_string_pretty(state).unwrap_or_else(|_| "{}".to_string()),
    )
    .map_err(|error| {
        LauncherError::technical("Não foi possível salvar estado do compartilhamento", error)
    })
}

pub fn clear_state() -> LauncherResult<()> {
    let path = state_path()?;
    if path.exists() {
        fs::remove_file(path).map_err(|error| {
            LauncherError::technical("Não foi possível limpar estado do compartilhamento", error)
        })?;
    }
    Ok(())
}
