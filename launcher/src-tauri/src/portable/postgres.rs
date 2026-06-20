use std::{
    ffi::{OsStr, OsString},
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{env as portable_env, types::PortableRuntimeConfig, PortableJob},
    scripts::{self, CommandOutput},
};

pub fn ensure_ready(
    ctx: &mut PortableJob<'_, '_>,
    config: &PortableRuntimeConfig,
) -> LauncherResult<u32> {
    let result = ensure_ready_steps(ctx, config);
    if result.is_err() && ctx.is_cancelled() {
        let _ = stop_best_effort();
    }
    result
}

fn ensure_ready_steps(
    ctx: &mut PortableJob<'_, '_>,
    config: &PortableRuntimeConfig,
) -> LauncherResult<u32> {
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
    let control_log_path = paths::mg_pocket_logs_dir()?.join("postgres-control.log");

    if let PgCtlStartPlan::Skip { pid } = pg_ctl_start_plan(
        database_ready(config),
        known_running_postmaster_pid(&data_dir),
    ) {
        ctx.progress(
            "Banco local",
            "PostgreSQL portátil já estava aceitando conexões.",
            54,
        );
        ctx.log(
            "Banco local",
            &format!(
                "PostgreSQL portátil já pronto na porta {}. pg_ctl start não será executado.",
                config.postgres_port
            ),
            "info",
        );
        return Ok(pid);
    }

    if let Some(pid) = prepare_existing_postmaster(ctx, config, &data_dir)? {
        return Ok(pid);
    }

    if let PgCtlStartPlan::Skip { pid } = pg_ctl_start_plan(
        database_ready(config),
        known_running_postmaster_pid(&data_dir),
    ) {
        ctx.progress(
            "Banco local",
            "PostgreSQL portátil já estava aceitando conexões.",
            54,
        );
        return Ok(pid);
    }

    let start_command = pg_ctl_start_command(&data_dir, &log_path, config.postgres_port)?;
    ctx.log(
        "Banco local",
        &format!(
            "PostgreSQL portátil: data_dir={}, log_path={}, porta={}, comando={}",
            data_dir.display(),
            log_path.display(),
            config.postgres_port,
            start_command.display,
        ),
        "info",
    );
    let output = run_pg_ctl_start_command(
        ctx,
        &start_command,
        &control_log_path,
        &log_path,
        Duration::from_secs(40),
    )?;

    if !output.success {
        ctx.progress(
            "Banco local",
            "pg_ctl retornou erro; conferindo se o banco respondeu mesmo assim.",
            52,
        );
        if pg_ctl_failure_recovered(server_ready(config) || database_ready(config)) {
            ctx.log(
                "Banco local",
                &format!(
                    "pg_ctl start retornou exit code {}, mas psql SELECT 1 respondeu na porta {}. Continuando.",
                    exit_code_text(output.code),
                    config.postgres_port,
                ),
                "info",
            );
            return Ok(known_running_postmaster_pid(&data_dir).unwrap_or(0));
        }
        return Err(pg_ctl_start_failure_error(
            &output,
            &start_command.display,
            config,
            &data_dir,
            &log_path,
            &control_log_path,
        ));
    }

    wait_for_server_ready(ctx, config, &log_path)?;
    Ok(read_postmaster_pid_from(&data_dir).unwrap_or(0))
}

pub fn stop(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    if !data_dir.join("PG_VERSION").is_file() {
        return Ok(());
    }
    let mut command = Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_ctl.exe"));
    command
        .arg("-D")
        .arg(data_dir)
        .args(["stop", "-m", "fast", "-w", "-t", "15"]);
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

pub(crate) fn prepare_for_repair(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let data_dir = paths::mg_pocket_data_content_dir()?.join("postgres");
    let _ = stop_best_effort();
    cleanup_stale_postmaster_pid(ctx, &data_dir)?;
    preserve_or_validate_data_dir_for_repair(ctx, &data_dir, false)
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

fn create_database_if_needed(
    ctx: &mut PortableJob<'_, '_>,
    config: &PortableRuntimeConfig,
) -> LauncherResult<()> {
    if database_ready(config) {
        return Ok(());
    }
    let log_path = paths::mg_pocket_logs_dir()?.join("postgres.log");
    let mut command =
        Command::new(paths::mg_pocket_runtime_dir()?.join("postgres/bin/createdb.exe"));
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
    let mut command = Command::new(
        paths::mg_pocket_runtime_dir()
            .unwrap_or_default()
            .join("postgres/bin/psql.exe"),
    );
    command
        .args([
            "-h",
            "127.0.0.1",
            "-U",
            "meg",
            "-d",
            database,
            "-tAc",
            "SELECT 1",
            "-p",
        ])
        .arg(config.postgres_port.to_string());
    scripts::prepare_child_command(&mut command);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    command_success_with_timeout(&mut command, Duration::from_secs(5))
}

fn run_migrations_and_seed(
    ctx: &mut PortableJob<'_, '_>,
    config: &PortableRuntimeConfig,
) -> LauncherResult<()> {
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
    portable_env::apply_database_env(&mut command, config);
    super::run_command(
        ctx,
        "Banco local",
        "Aplicando migrations e seed quando necessário.",
        58,
        &mut command,
        Duration::from_secs(10 * 60),
    )
    .map(|_| ())
    .map_err(|error| {
        LauncherError::new(
            "Não foi possível aplicar migrations e dados iniciais.",
            format!(
                "Falha em migrations/seed do PostgreSQL portátil.\n{}",
                error.technical_message()
            ),
        )
    })
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
            &format!(
                "Binários PostgreSQL encontrados em {}",
                runtime_dir.join("postgres/bin").display()
            ),
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
        &format!(
            "postmaster.pid encontrado: {} (pid={pid})",
            pid_path.display()
        ),
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

fn cleanup_stale_postmaster_pid(
    ctx: &mut PortableJob<'_, '_>,
    data_dir: &Path,
) -> LauncherResult<()> {
    let pid_path = postmaster_pid_path(data_dir);
    let Some(pid) = read_postmaster_pid_from(data_dir) else {
        return Ok(());
    };

    if process_alive(pid) {
        ctx.log(
            "Reparo",
            &format!(
                "postmaster.pid ainda aponta para processo ativo (pid={pid}); mantendo {}.",
                pid_path.display()
            ),
            "info",
        );
        return Ok(());
    }

    ctx.log(
        "Reparo",
        &format!("Removendo postmaster.pid stale em {}.", pid_path.display()),
        "info",
    );
    fs::remove_file(pid_path).map_err(|error| {
        LauncherError::technical("Não foi possível remover postmaster.pid antigo", error)
    })
}

fn preserve_or_validate_data_dir_for_repair(
    ctx: &mut PortableJob<'_, '_>,
    data_dir: &Path,
    recreate_incomplete_confirmed: bool,
) -> LauncherResult<()> {
    if data_dir.join("PG_VERSION").is_file() {
        ctx.log(
            "Reparo",
            &format!(
                "data_dir PostgreSQL válido preservado: {}",
                data_dir.display()
            ),
            "info",
        );
        return Ok(());
    }

    if !data_dir.exists() || data_dir_is_empty(data_dir) {
        return Ok(());
    }

    if recreate_incomplete_confirmed {
        ctx.log(
            "Reparo",
            &format!(
                "Recriando data_dir PostgreSQL incompleto: {}",
                data_dir.display()
            ),
            "info",
        );
        fs::remove_dir_all(data_dir).map_err(|error| {
            LauncherError::technical(
                "Não foi possível remover data_dir PostgreSQL incompleto",
                error,
            )
        })?;
        fs::create_dir_all(data_dir).map_err(|error| {
            LauncherError::technical("Não foi possível recriar data_dir PostgreSQL", error)
        })?;
        return Ok(());
    }

    Err(LauncherError::new(
        "A pasta de dados do PostgreSQL está incompleta.",
        format!(
            "data_dir sem PG_VERSION e com arquivos existentes: {}\nO reparo automático preservou esta pasta. Recriação do data_dir exige confirmação explícita para evitar perda de dados.",
            data_dir.display()
        ),
    ))
}

fn data_dir_is_empty(data_dir: &Path) -> bool {
    fs::read_dir(data_dir)
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(true)
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

fn known_running_postmaster_pid(data_dir: &Path) -> Option<u32> {
    read_postmaster_pid_from(data_dir).filter(|pid| process_alive(*pid))
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

#[derive(Debug, Eq, PartialEq)]
enum PgCtlStartPlan {
    Skip { pid: u32 },
    Run,
}

fn pg_ctl_start_plan(database_already_ready: bool, known_pid: Option<u32>) -> PgCtlStartPlan {
    if database_already_ready {
        PgCtlStartPlan::Skip {
            pid: known_pid.unwrap_or(0),
        }
    } else {
        PgCtlStartPlan::Run
    }
}

fn pg_ctl_failure_recovered(readiness_after_failure: bool) -> bool {
    readiness_after_failure
}

#[derive(Debug)]
struct PgCtlStartCommand {
    program: PathBuf,
    args: Vec<OsString>,
    display: String,
}

fn pg_ctl_start_command(
    data_dir: &Path,
    postgres_log_path: &Path,
    port: u16,
) -> LauncherResult<PgCtlStartCommand> {
    let program = paths::mg_pocket_runtime_dir()?.join("postgres/bin/pg_ctl.exe");
    Ok(PgCtlStartCommand::new(
        program,
        data_dir,
        postgres_log_path,
        port,
    ))
}

impl PgCtlStartCommand {
    fn new(program: PathBuf, data_dir: &Path, postgres_log_path: &Path, port: u16) -> Self {
        let args = pg_ctl_start_args(data_dir, postgres_log_path, port);
        let display = display_command(program.as_os_str(), &args);
        Self {
            program,
            args,
            display,
        }
    }
}

fn pg_ctl_start_args(data_dir: &Path, postgres_log_path: &Path, port: u16) -> Vec<OsString> {
    vec![
        OsString::from("start"),
        OsString::from("-D"),
        data_dir.as_os_str().to_os_string(),
        OsString::from("-l"),
        postgres_log_path.as_os_str().to_os_string(),
        OsString::from("-o"),
        OsString::from(format!("-p {port} -h 127.0.0.1")),
        OsString::from("-w"),
        OsString::from("-t"),
        OsString::from("30"),
    ]
}

fn run_pg_ctl_start_command(
    ctx: &mut PortableJob<'_, '_>,
    start_command: &PgCtlStartCommand,
    control_log_path: &Path,
    postgres_log_path: &Path,
    timeout: Duration,
) -> LauncherResult<CommandOutput> {
    ctx.progress("Banco local", "Iniciando PostgreSQL portátil.", 50);
    let stdout_path = control_capture_path(control_log_path, "stdout");
    let stderr_path = control_capture_path(control_log_path, "stderr");
    let _ = fs::remove_file(&stdout_path);
    let _ = fs::remove_file(&stderr_path);

    append_control_log(
        control_log_path,
        &format!(
            "\n=== pg_ctl start {} ===\ncomando: {}\npostgres.log: {}\n",
            unix_timestamp_for_log(),
            start_command.display,
            postgres_log_path.display(),
        ),
    )?;

    let stdout_file = create_capture_file(&stdout_path)?;
    let stderr_file = create_capture_file(&stderr_path)?;
    let mut command = Command::new(&start_command.program);
    command.args(&start_command.args);
    scripts::prepare_child_command(&mut command);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout_file))
        .stderr(Stdio::from(stderr_file));

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            let output = CommandOutput {
                success: false,
                code: None,
                stdout: String::new(),
                stderr: format!("Não foi possível executar pg_ctl: {error}"),
            };
            write_control_result(control_log_path, postgres_log_path, &output)?;
            return Ok(output);
        }
    };

    let started = Instant::now();
    let output = loop {
        if ctx.is_cancelled() {
            let _ = child.kill();
            let _ = child.wait();
            let output = CommandOutput {
                success: false,
                code: None,
                stdout: read_capture_file(&stdout_path),
                stderr: append_capture_note(
                    read_capture_file(&stderr_path),
                    "Operação cancelada pelo usuário.",
                ),
            };
            write_control_result(control_log_path, postgres_log_path, &output)?;
            return Err(LauncherError::friendly("Operação cancelada."));
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                break CommandOutput {
                    success: status.success(),
                    code: status.code(),
                    stdout: read_capture_file(&stdout_path),
                    stderr: read_capture_file(&stderr_path),
                };
            }
            Ok(None) => {}
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                break CommandOutput {
                    success: false,
                    code: None,
                    stdout: read_capture_file(&stdout_path),
                    stderr: append_capture_note(
                        read_capture_file(&stderr_path),
                        &format!("Não foi possível acompanhar pg_ctl: {error}"),
                    ),
                };
            }
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            break CommandOutput {
                success: false,
                code: None,
                stdout: read_capture_file(&stdout_path),
                stderr: append_capture_note(
                    read_capture_file(&stderr_path),
                    "Timeout aguardando pg_ctl start finalizar.",
                ),
            };
        }

        std::thread::sleep(Duration::from_millis(80));
    };

    write_control_result(control_log_path, postgres_log_path, &output)?;
    Ok(output)
}

fn create_capture_file(path: &Path) -> LauncherResult<fs::File> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de logs", error)
        })?;
    }
    fs::OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(path)
        .map_err(|error| {
            LauncherError::technical("Não foi possível criar captura do pg_ctl", error)
        })
}

fn control_capture_path(control_log_path: &Path, stream: &str) -> PathBuf {
    control_log_path.with_file_name(format!("postgres-control.{stream}.tmp"))
}

fn read_capture_file(path: &Path) -> String {
    fs::read_to_string(path).unwrap_or_default()
}

fn append_capture_note(mut text: String, note: &str) -> String {
    if !text.trim().is_empty() {
        text.push('\n');
    }
    text.push_str(note);
    text
}

fn write_control_result(
    control_log_path: &Path,
    postgres_log_path: &Path,
    output: &CommandOutput,
) -> LauncherResult<()> {
    let postgres_tail = tail_file(postgres_log_path, 80)
        .filter(|tail| !tail.trim().is_empty())
        .unwrap_or_else(|| "postgres.log vazio ou indisponível.".to_string());
    append_control_log(
        control_log_path,
        &format!(
            "exit code: {}\nstdout:\n{}\nstderr:\n{}\nultimas linhas de {}:\n{}\n",
            exit_code_text(output.code),
            non_empty_log_text(&output.stdout),
            non_empty_log_text(&output.stderr),
            postgres_log_path.display(),
            postgres_tail,
        ),
    )
}

fn append_control_log(path: &Path, content: &str) -> LauncherResult<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de logs", error)
        })?;
    }
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| {
            LauncherError::technical("Não foi possível abrir postgres-control.log", error)
        })?;
    file.write_all(content.as_bytes()).map_err(|error| {
        LauncherError::technical("Não foi possível gravar postgres-control.log", error)
    })
}

fn pg_ctl_start_failure_error(
    output: &CommandOutput,
    command_display: &str,
    config: &PortableRuntimeConfig,
    data_dir: &Path,
    postgres_log_path: &Path,
    control_log_path: &Path,
) -> LauncherError {
    postgres_error_with_log(
        "Não foi possível iniciar o banco local.",
        format!(
            "Comando executado: {command_display}\nExit code: {}\nPorta: {}\ndata_dir: {}\npostgres.log: {}\npostgres-control.log: {}\nSTDOUT:\n{}\nSTDERR:\n{}",
            exit_code_text(output.code),
            config.postgres_port,
            data_dir.display(),
            postgres_log_path.display(),
            control_log_path.display(),
            non_empty_log_text(&output.stdout),
            non_empty_log_text(&output.stderr),
        ),
        postgres_log_path,
    )
}

fn exit_code_text(code: Option<i32>) -> String {
    code.map(|code| code.to_string())
        .unwrap_or_else(|| "indisponível".to_string())
}

fn non_empty_log_text(text: &str) -> &str {
    if text.trim().is_empty() {
        "(vazio)"
    } else {
        text.trim_end()
    }
}

fn display_command(program: &OsStr, args: &[OsString]) -> String {
    std::iter::once(program)
        .chain(args.iter().map(OsString::as_os_str))
        .map(quote_command_arg)
        .collect::<Vec<_>>()
        .join(" ")
}

fn quote_command_arg(value: &OsStr) -> String {
    let text = value.to_string_lossy();
    if text.is_empty() {
        return "\"\"".to_string();
    }
    if text
        .chars()
        .any(|ch| ch.is_whitespace() || matches!(ch, '"' | '\'' | '&' | '|'))
    {
        format!("\"{}\"", text.replace('"', "\\\""))
    } else {
        text.to_string()
    }
}

fn unix_timestamp_for_log() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config(port: u16) -> PortableRuntimeConfig {
        PortableRuntimeConfig {
            runtime_mode: "portable".to_string(),
            version: "v1.1.0".to_string(),
            runtime_version: "v1.1.0".to_string(),
            public_port: 3000,
            next_port: 3001,
            postgres_port: port,
            app_url: "http://localhost:3000".to_string(),
            installed_at: "0".to_string(),
        }
    }

    #[test]
    fn pg_ctl_start_command_places_start_before_options() {
        let data_dir = Path::new(r"C:\Users\user\AppData\Local\MG Pocket\data\postgres");
        let postgres_log = Path::new(r"C:\Users\user\AppData\Local\MG Pocket\logs\postgres.log");

        let args = pg_ctl_start_args(data_dir, postgres_log, 54321)
            .into_iter()
            .map(|arg| arg.to_string_lossy().to_string())
            .collect::<Vec<_>>();

        assert_eq!(args[0], "start");
        assert_eq!(args[1], "-D");
        assert_eq!(args[2], data_dir.to_string_lossy());
        assert_eq!(args[3], "-l");
        assert_eq!(args[4], postgres_log.to_string_lossy());
        assert_eq!(args[5], "-o");
        assert_eq!(args[6], "-p 54321 -h 127.0.0.1");
        assert_eq!(&args[7..], ["-w", "-t", "30"]);
    }

    #[test]
    fn pg_ctl_start_is_skipped_when_database_ready() {
        assert_eq!(
            pg_ctl_start_plan(true, Some(4321)),
            PgCtlStartPlan::Skip { pid: 4321 }
        );
        assert_eq!(
            pg_ctl_start_plan(true, None),
            PgCtlStartPlan::Skip { pid: 0 }
        );
        assert_eq!(pg_ctl_start_plan(false, Some(4321)), PgCtlStartPlan::Run);
    }

    #[test]
    fn pg_ctl_failure_is_success_when_readiness_passes() {
        assert!(pg_ctl_failure_recovered(true));
        assert!(!pg_ctl_failure_recovered(false));
    }

    #[test]
    fn pg_ctl_failure_error_mentions_control_log_and_command_details() {
        let output = CommandOutput {
            success: false,
            code: Some(1),
            stdout: "pg_ctl stdout".to_string(),
            stderr: "pg_ctl stderr".to_string(),
        };
        let data_dir = Path::new(r"C:\Users\user\AppData\Local\MG Pocket\data\postgres");
        let postgres_log = Path::new(r"C:\Users\user\AppData\Local\MG Pocket\logs\postgres.log");
        let control_log =
            Path::new(r"C:\Users\user\AppData\Local\MG Pocket\logs\postgres-control.log");

        let error = pg_ctl_start_failure_error(
            &output,
            r#""C:\pg\bin\pg_ctl.exe" start -D "C:\data""#,
            &test_config(54321),
            data_dir,
            postgres_log,
            control_log,
        );

        assert_eq!(
            error.friendly_message(),
            "Não foi possível iniciar o banco local."
        );
        let technical = error.technical_message();
        assert!(technical.contains(r#""C:\pg\bin\pg_ctl.exe" start"#));
        assert!(technical.contains("Exit code: 1"));
        assert!(technical.contains("Porta: 54321"));
        assert!(technical.contains("data_dir:"));
        assert!(technical.contains("postgres.log:"));
        assert!(technical.contains("postgres-control.log:"));
        assert!(technical.contains("pg_ctl stdout"));
        assert!(technical.contains("pg_ctl stderr"));
    }
}
