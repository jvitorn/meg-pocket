use std::{path::PathBuf, process::Command};

use crate::{
    errors::LauncherResult,
    paths,
    portable::{env as portable_env, types::PortableRuntimeConfig},
    scripts,
};

pub fn node_exe() -> LauncherResult<PathBuf> {
    Ok(paths::mg_pocket_runtime_dir()?
        .join("node")
        .join("node.exe"))
}

pub fn next_command(config: &PortableRuntimeConfig) -> LauncherResult<Command> {
    let mut command = Command::new(node_exe()?);
    command.arg(paths::mg_pocket_app_dir()?.join("server.js"));
    command.current_dir(paths::mg_pocket_app_dir()?);
    scripts::prepare_child_command(&mut command);
    portable_env::apply_to_command(&mut command, config)?;
    Ok(command)
}
