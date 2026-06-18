use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant},
};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{types::PortableRuntimeConfig, PortableJob},
    scripts,
};

pub fn ensure_ready(ctx: &mut PortableJob<'_, '_>, config: &PortableRuntimeConfig) -> LauncherResult<u32> {
    let result = ensure_ready_steps(ctx, config);
    if result.is_err() && ctx.is_cancelled() {
        let _ = stop_best_effort();
    }
    result
}

fn ensure_ready_steps(ctx: &mut PortableJob<'_, '_>, config: &PortableRuntimeConfig) -> LauncherResult<u32> {
    validate_required_binaries(ctx)?;
    initdb_if_needed(ctx)?;
    let pid = start(ctx, config)?;
    create_database_if_needed(ctx, config)?;
    run_migrations_and_seed(ctx, config)?;
    Ok(pid)
}

pub fn start(ctx: &mut PortableJob<'_, '_>, config: &PortableRuntimeConfig) -> LauncherResult<u32> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    let log_path = paths::mg_pocket_logs_dir()?.join("postgres.log");
    if let Some(pid) = prepare_existing_postmaster(ctx, config, &data_dir)? {
        return Ok(pid);
    }

    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_ctl.exe"));
    command
        .arg("-D")
        .arg(&data_dir)
        .arg("-l")
        .arg(&log_path)
        .arg("-o")
        .arg(format!("-p {} -h 127.0.0.1", config.postgres_port))
        .arg("-w")
        .arg("-t")
        .arg("30")
        .arg("start");
    ctx.log(
        "Banco local",
        &format!(
            "PostgreSQL portátil: data_dir={}, log_path={}, porta={}, comando={command:?}",
            data_dir.display(),
            log_path.display(),
            config.postgres_port,
        ),
        "info",
    );
    super::run_daemon_start_command(
        ctx,
        "Banco local",
        "Iniciando PostgreSQL portátil.",
        50,
        &mut command,
        Duration::from_secs(40),
        Some(&log_path),
    )
    .map_err(|error| {
        if ctx.is_cancelled() {
            error
        } else {
            postgres_error_with_log(
                "Não foi possível iniciar o PostgreSQL portátil.",
                error.technical_message(),
                &log_path,
            )
        }
    })?;

    wait_for_server_ready(ctx, config, &log_path)?;
    Ok(read_postmaster_pid_from(&data_dir).unwrap_or(0))
}

pub fn stop(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    if !data_dir.join("PG_VERSION").is_file() {
        return Ok(());
    }
    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_ctl.exe"));
    command.arg("-D").arg(data_dir).args(["stop", "-m", "fast", "-w", "-t", "15"]);
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

pub(crate) fn stop_best_effort() -> LauncherResult<()> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    let pg_ctl = paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_ctl.exe");
    if !pg_ctl.is_file() || !data_dir.join("PG_VERSION").is_file() {
        return Ok(());
    }
    let mut command = Command::new(pg_ctl);
    scripts::prepare_child_command(&mut command);
    command
        .arg("-D")
        .arg(data_dir)
        .args(["stop", "-m", "fast", "-w", "-t", "15"])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    let _ = command_success_with_timeout(&mut command, Duration::from_secs(20));
    Ok(())
}

fn initdb_if_needed(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    if data_dir.join("PG_VERSION").is_file() {
        return Ok(());
    }
    ctx.progress(
        "Banco local",
        "Criando pasta de dados do PostgreSQL portátil.",
        38,
    );
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
        "Banco local",
        "Rodando initdb do PostgreSQL portátil.",
        42,
        &mut command,
        Duration::from_secs(90),
    )
    .map(|_| ())
}

fn create_database_if_needed(ctx: &mut PortableJob<'_, '_>, config: &PortableRuntimeConfig) -> LauncherResult<()> {
    if database_ready(config) {
        return Ok(());
    }
    let log_path = paths::mg_pocket_logs_dir()?.join("postgres.log");
    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/createdb.exe"));
    command
        .args(["-h", "127.0.0.1", "-U", "meg", "-p"])
        .arg(config.postgres_port.to_string())
        .arg("meg_pocket");
    super::run_command(
        ctx,
        "Banco local",
        "Criando banco meg_pocket.",
        56,
        &mut command,
        Duration::from_secs(30),
    )?;
    if database_ready(config) {
        Ok(())
    } else {
        Err(postgres_error_with_log(
            "O PostgreSQL iniciou, mas o banco local não respondeu.",
            "createdb terminou sem deixar meg_pocket pronto.",
            &log_path,
        ))
    }
}

pub fn database_ready(config: &PortableRuntimeConfig) -> bool {
    psql_select_one(config, "meg_pocket")
}

fn server_ready(config: &PortableRuntimeConfig) -> bool {
    psql_select_one(config, "postgres")
}

fn psql_select_one(config: &PortableRuntimeConfig, database: &str) -> bool {
    let mut command = Command::new(paths::mg_pocket_runtime_dir().unwrap_or_default().join("postgres/bin/psql.exe"));
    command
        .args(["-h", "127.0.0.1", "-U", "meg", "-d", database, "-tAc", "SELECT 1", "-p"])
        .arg(config.postgres_port.to_string());
    scripts::prepare_child_command(&mut command);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    command_success_with_timeout(&mut command, Duration::from_secs(5))
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
        "Banco local",
        "Aplicando migrations e seed quando necessário.",
        58,
        &mut command,
        Duration::from_secs(10 * 60),
    )
    .map(|_| ())
}

fn validate_required_binaries(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    ctx.progress(
        "Banco local",
        "Verificando arquivos do PostgreSQL portátil.",
        36,
    );
    let runtime_dir = paths::mg_pocket_runtime_dir()?;
    let required = [
        "postgres/bin/postgres.exe",
        "postgres/bin/pg_ctl.exe",
        "postgres/bin/initdb.exe",
        "postgres/bin/psql.exe",
        "postgres/bin/createdb.exe",
    ];
    let missing = required
        .iter()
        .map(|relative| runtime_dir.join(relative))
        .filter(|path| !path.is_file())
        .collect::<Vec<_>>();

    if missing.is_empty() {
        ctx.log(
            "Banco local",
            &format!("Binários PostgreSQL encontrados em {}", runtime_dir.join("postgres/bin").display()),
            "info",
        );
        Ok(())
    } else {
        Err(LauncherError::new(
            "A instalação local do PostgreSQL está incompleta. Use Reparar instalação.",
            format!(
                "Arquivos PostgreSQL ausentes:\n{}",
                missing
                    .iter()
                    .map(|path| path.display().to_string())
                    .collect::<Vec<_>>()
                    .join("\n")
            ),
        ))
    }
}

fn prepare_existing_postmaster(
    ctx: &mut PortableJob<'_, '_>,
    config: &PortableRuntimeConfig,
    data_dir: &Path,
) -> LauncherResult<Option<u32>> {
    let pid_path = postmaster_pid_path(data_dir);
    let Some(pid) = read_postmaster_pid_from(data_dir) else {
        return Ok(None);
    };

    ctx.log(
        "Banco local",
        &format!("postmaster.pid encontrado: {} (pid={pid})", pid_path.display()),
        "info",
    );

    if process_alive(pid) {
        if server_ready(config) {
            ctx.progress(
                "Banco local",
                "PostgreSQL portátil já estava em execução.",
                54,
            );
            return Ok(Some(pid));
        }

        ctx.log(
            "Banco local",
            "postmaster.pid aponta para processo ativo, mas readiness falhou. Tentando parar para iniciar limpo.",
            "error",
        );
        let _ = stop_best_effort();
        return Ok(None);
    }

    ctx.log(
        "Banco local",
        "postmaster.pid estava stale e será removido antes de iniciar.",
        "info",
    );
    fs::remove_file(pid_path).map_err(|error| {
        LauncherError::technical("Não foi possível remover postmaster.pid antigo", error)
    })?;
    Ok(None)
}

fn wait_for_server_ready(
    ctx: &mut PortableJob<'_, '_>,
    config: &PortableRuntimeConfig,
    log_path: &Path,
) -> LauncherResult<()> {
    ctx.progress(
        "Banco local",
        "Aguardando PostgreSQL portátil responder.",
        54,
    );
    let started = Instant::now();
    while started.elapsed() < Duration::from_secs(60) {
        if ctx.is_cancelled() {
            let _ = stop_best_effort();
            return Err(LauncherError::friendly("Operação cancelada."));
        }
        if server_ready(config) {
            return Ok(());
        }
        std::thread::sleep(Duration::from_secs(1));
    }

    let _ = stop_best_effort();
    Err(postgres_error_with_log(
        "O PostgreSQL portátil não respondeu a tempo.",
        "Timeout aguardando psql SELECT 1 no banco postgres.",
        log_path,
    ))
}

fn read_postmaster_pid_from(data_dir: &Path) -> Option<u32> {
    let text = fs::read_to_string(postmaster_pid_path(data_dir)).ok()?;
    text.lines().next()?.trim().parse().ok()
}

fn postmaster_pid_path(data_dir: &Path) -> PathBuf {
    data_dir.join("postmaster.pid")
}

fn process_alive(pid: u32) -> bool {
    if pid == 0 {
        return false;
    }
    if cfg!(target_os = "windows") {
        let mut command = Command::new("tasklist");
        scripts::prepare_child_command(&mut command);
        let output = command
            .args(["/FI", &format!("PID eq {pid}"), "/NH"])
            .stdin(Stdio::null())
            .output();
        return output
            .ok()
            .and_then(|output| String::from_utf8(output.stdout).ok())
            .map(|text| text.contains(&pid.to_string()))
            .unwrap_or(false);
    }
    PathBuf::from(format!("/proc/{pid}")).exists()
}

fn command_success_with_timeout(command: &mut Command, timeout: Duration) -> bool {
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(_) => return false,
    };
    let started = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return status.success(),
            Ok(None) => {}
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return false;
            }
        }
        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return false;
        }
        std::thread::sleep(Duration::from_millis(80));
    }
}

fn postgres_error_with_log(
    friendly: impl Into<String>,
    technical: impl Into<String>,
    log_path: &Path,
) -> LauncherError {
    let technical = technical.into();
    let log_tail = tail_file(log_path, 60)
        .filter(|tail| !tail.trim().is_empty())
        .unwrap_or_else(|| "postgres.log vazio ou indisponível.".to_string());
    LauncherError::new(
        friendly,
        format!(
            "{technical}\n\nÚltimas linhas de {}:\n{}",
            log_path.display(),
            log_tail
        ),
    )
}

fn tail_file(path: &Path, max_lines: usize) -> Option<String> {
    let text = fs::read_to_string(path).ok()?;
    let lines = text.lines().collect::<Vec<_>>();
    let start = lines.len().saturating_sub(max_lines);
    Some(lines[start..].join("\n"))
}
