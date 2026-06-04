use std::{path::PathBuf, process::Command};

use crate::{
    errors::LauncherResult,
    paths,
    portable::types::PortableRuntimeConfig,
    scripts,
};

pub fn node_exe() -> LauncherResult<PathBuf> {
    Ok(paths::mg_pocket_runtime_dir()?.join("node").join("node.exe"))
}

pub fn next_command(config: &PortableRuntimeConfig) -> LauncherResult<Command> {
    let mut command = Command::new(node_exe()?);
    command.arg(paths::mg_pocket_app_dir()?.join("server.js"));
    command.current_dir(paths::mg_pocket_app_dir()?);
    scripts::sanitize_child_environment(&mut command);
    command.env("PORT", config.next_port.to_string());
    command.env("HOSTNAME", "127.0.0.1");
    command.env(
        "DATABASE_URL",
        format!(
            "postgresql://meg:meg@127.0.0.1:{}/meg_pocket?schema=public",
            config.postgres_port
        ),
    );
    command.env(
        "DIRECT_URL",
        format!(
            "postgresql://meg:meg@127.0.0.1:{}/meg_pocket?schema=public",
            config.postgres_port
        ),
    );
    command.env("NEXTAUTH_URL", &config.app_url);
    command.env("NEXT_PUBLIC_BASE_URL", &config.app_url);
    command.env(
        "STORAGE_LOCAL_DIR",
        paths::mg_pocket_data_content_dir()?.join("uploads"),
    );
    command.env("STORAGE_LOCAL_PUBLIC_URL", "/uploads");
    Ok(command)
}
