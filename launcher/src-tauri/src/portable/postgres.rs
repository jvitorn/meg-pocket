use std::{fs, process::Command, time::Duration};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{types::PortableRuntimeConfig, PortableJob},
    scripts,
};

pub fn ensure_ready(ctx: &mut PortableJob<'_, '_>, config: &PortableRuntimeConfig) -> LauncherResult<u32> {
    initdb_if_needed(ctx)?;
    let pid = start(ctx, config)?;
    create_database_if_needed(ctx, config)?;
    run_migrations_and_seed(ctx, config)?;
    Ok(pid)
}

pub fn start(ctx: &mut PortableJob<'_, '_>, config: &PortableRuntimeConfig) -> LauncherResult<u32> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    let log_path = paths::mg_pocket_logs_dir()?.join("postgres.log");
    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_ctl.exe"));
    command
        .arg("-D")
        .arg(&data_dir)
        .arg("-l")
        .arg(&log_path)
        .arg("-o")
        .arg(format!("-p {} -h 127.0.0.1", config.postgres_port))
        .arg("start");
    super::run_command(
        ctx,
        "Preparando banco local",
        "Iniciando PostgreSQL portátil.",
        35,
        &mut command,
        Duration::from_secs(30),
    )?;
    Ok(read_postmaster_pid().unwrap_or(0))
}

pub fn stop(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    if !data_dir.join("PG_VERSION").is_file() {
        return Ok(());
    }
    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_ctl.exe"));
    command.arg("-D").arg(data_dir).args(["stop", "-m", "fast"]);
    super::run_command(
        ctx,
        "Parando banco local",
        "Parando PostgreSQL portátil.",
        70,
        &mut command,
        Duration::from_secs(15),
    )
    .map(|_| ())
}

fn initdb_if_needed(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    if data_dir.join("PG_VERSION").is_file() {
        return Ok(());
    }
    fs::create_dir_all(&data_dir).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta do banco portátil", error)
    })?;
    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/initdb.exe"));
    command
        .arg("-D")
        .arg(&data_dir)
        .args(["-U", "meg", "--encoding=UTF8", "--auth=trust"]);
    super::run_command(
        ctx,
        "Preparando banco local",
        "Criando dados iniciais do PostgreSQL portátil.",
        25,
        &mut command,
        Duration::from_secs(90),
    )
    .map(|_| ())
}

fn create_database_if_needed(ctx: &mut PortableJob<'_, '_>, config: &PortableRuntimeConfig) -> LauncherResult<()> {
    if database_ready(config) {
        return Ok(());
    }
    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/createdb.exe"));
    command
        .args(["-h", "127.0.0.1", "-U", "meg", "-p"])
        .arg(config.postgres_port.to_string())
        .arg("meg_pocket");
    super::run_command(
        ctx,
        "Preparando banco local",
        "Criando banco meg_pocket.",
        42,
        &mut command,
        Duration::from_secs(30),
    )
    .map(|_| ())
}

pub fn database_ready(config: &PortableRuntimeConfig) -> bool {
    let mut command = Command::new(paths::mg_pocket_runtime_dir().unwrap_or_default().join("postgres/bin/psql.exe"));
    command
        .args(["-h", "127.0.0.1", "-U", "meg", "-d", "meg_pocket", "-tAc", "SELECT 1", "-p"])
        .arg(config.postgres_port.to_string());
    scripts::prepare_child_command(&mut command);
    command.output().map(|output| output.status.success()).unwrap_or(false)
}

fn run_migrations_and_seed(ctx: &mut PortableJob<'_, '_>, config: &PortableRuntimeConfig) -> LauncherResult<()> {
    let script = paths::mg_pocket_data_dir()?.join("scripts/portable-db-setup.mjs");
    if !script.is_file() {
        ctx.log(
            "Carregando dados iniciais",
            "TODO: scripts/portable-db-setup.mjs não está no runtime; o workflow deve incluí-lo.",
            "error",
        );
        return Ok(());
    }
    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("node/node.exe"));
    command.arg(script);
    command.current_dir(paths::mg_pocket_data_dir()?);
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
    super::run_command(
        ctx,
        "Carregando dados iniciais",
        "Aplicando migrations e seed quando necessário.",
        50,
        &mut command,
        Duration::from_secs(10 * 60),
    )
    .map(|_| ())
}

fn read_postmaster_pid() -> Option<u32> {
    let path = paths::mg_pocket_data_content_dir()
        .ok()?
        .join("postgres")
        .join("postmaster.pid");
    let text = fs::read_to_string(path).ok()?;
    text.lines().next()?.trim().parse().ok()
}
