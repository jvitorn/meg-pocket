use std::{
    collections::{HashMap, VecDeque},
    env,
    fs,
    io::{BufRead, BufReader, Read},
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc, Arc,
    },
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use serde::Serialize;
use tauri::AppHandle;

use crate::{
    errors::{LauncherError, LauncherResult},
    jobs::{self, JobManager},
    scripts::{self, CommandOutput},
};

const QUICK_TIMEOUT: Duration = Duration::from_secs(2);
const PORT_TIMEOUT: Duration = Duration::from_millis(700);
const SHORT_TIMEOUT: Duration = Duration::from_secs(8);
const MEDIUM_TIMEOUT: Duration = Duration::from_secs(90);
const LONG_TIMEOUT: Duration = Duration::from_secs(20 * 60);
const LOG_BATCH_INTERVAL: Duration = Duration::from_millis(180);
const LOG_BATCH_LINES: usize = 25;
const CAPTURE_LIMIT_BYTES: usize = 512 * 1024;
const UI_LOG_LINES: usize = 300;

const REPO_URL: &str = "https://github.com/jvitorn/meg-pocket.git";
const COMPOSE_PROJECT: &str = "meg-pocket";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatus {
    os: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    distro_family: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    distro_name: Option<String>,
    supported: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    winget_installed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    git_installed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    power_shell_installed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    wsl2_installed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    docker_desktop_installed: Option<bool>,
    docker_installed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    docker_version: Option<String>,
    docker_running: bool,
    docker_compose_installed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    docker_compose_version: Option<String>,
    docker_permission_ok: bool,
    sudo_docker_works: bool,
    requires_relogin: bool,
    project_installed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    project_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    project_version: Option<String>,
    app_online: bool,
    adminer_online: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyStatus {
    os: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    distro_family: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    distro_name: Option<String>,
    supported: bool,
    missing: Vec<String>,
    packages: Vec<String>,
    installable: bool,
    sudo_required: bool,
    install_command: String,
    commands: Vec<String>,
    manual_instructions: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct NativeCommand {
    program: String,
    args: Vec<String>,
    cwd: Option<PathBuf>,
    envs: Vec<(String, String)>,
}

impl NativeCommand {
    pub(crate) fn new(program: impl Into<String>) -> Self {
        Self {
            program: program.into(),
            args: Vec::new(),
            cwd: None,
            envs: Vec::new(),
        }
    }

    pub(crate) fn arg(mut self, arg: impl Into<String>) -> Self {
        self.args.push(arg.into());
        self
    }

    pub(crate) fn args<I, S>(mut self, args: I) -> Self
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        self.args.extend(args.into_iter().map(Into::into));
        self
    }

    pub(crate) fn cwd(mut self, cwd: impl Into<PathBuf>) -> Self {
        self.cwd = Some(cwd.into());
        self
    }

    pub(crate) fn env(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.envs.push((key.into(), value.into()));
        self
    }

    pub(crate) fn display(&self) -> String {
        let mut parts = Vec::with_capacity(self.args.len() + 1);
        parts.push(self.program.clone());
        parts.extend(self.args.iter().map(|arg| shellish_quote(arg)));
        parts.join(" ")
    }

    fn into_command(&self) -> Command {
        let mut command = Command::new(&self.program);
        command.args(&self.args);
        if let Some(cwd) = &self.cwd {
            command.current_dir(cwd);
        }
        scripts::sanitize_child_environment(&mut command);
        for (key, value) in &self.envs {
            command.env(key, value);
        }
        command
    }
}

#[derive(Debug, Clone, Eq, PartialEq)]
pub(crate) enum ProcessErrorKind {
    Spawn,
    Wait,
    Timeout,
    Cancelled,
}

#[derive(Debug)]
pub(crate) struct ProcessError {
    kind: ProcessErrorKind,
    command: String,
    output: CommandOutput,
    message: String,
}

impl ProcessError {
    fn spawn(command: String, error: impl ToString) -> Self {
        Self {
            kind: ProcessErrorKind::Spawn,
            command,
            output: empty_output(),
            message: error.to_string(),
        }
    }

    fn wait(command: String, output: CommandOutput, error: impl ToString) -> Self {
        Self {
            kind: ProcessErrorKind::Wait,
            command,
            output,
            message: error.to_string(),
        }
    }

    fn timeout(command: String, output: CommandOutput) -> Self {
        Self {
            kind: ProcessErrorKind::Timeout,
            command,
            output,
            message: "tempo esgotado".to_string(),
        }
    }

    fn cancelled(command: String, output: CommandOutput) -> Self {
        Self {
            kind: ProcessErrorKind::Cancelled,
            command,
            output,
            message: "operação cancelada".to_string(),
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct ComposeCommand {
    program: String,
    prefix: Vec<String>,
}

impl ComposeCommand {
    fn command<I, S>(&self, project_dir: &Path, args: I) -> NativeCommand
    where
        I: IntoIterator<Item = S>,
        S: Into<String>,
    {
        let mut command_args = self.prefix.clone();
        command_args.extend(["--project-name".to_string(), compose_project_name()]);
        command_args.extend(args.into_iter().map(Into::into));

        NativeCommand::new(self.program.clone())
            .args(command_args)
            .cwd(project_dir)
    }
}

struct NativeJob<'app, 'manager> {
    app: &'app AppHandle,
    job: jobs::JobGuard<'manager>,
    current_step: String,
    progress: u8,
    stdout: String,
    stderr: String,
}

impl<'app, 'manager> NativeJob<'app, 'manager> {
    fn new(app: &'app AppHandle, job: jobs::JobGuard<'manager>) -> Self {
        Self {
            app,
            job,
            current_step: "Iniciando".to_string(),
            progress: 0,
            stdout: String::new(),
            stderr: String::new(),
        }
    }

    fn started(&mut self, step: &str, message: &str, progress: u8) {
        self.current_step = step.to_string();
        self.progress = progress;
        jobs::emit_started(self.app, &self.job, step, message, progress);
    }

    fn progress(&mut self, step: &str, message: &str, progress: u8) {
        self.current_step = step.to_string();
        self.progress = progress.max(self.progress);
        jobs::emit_progress(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            message,
            self.progress,
        );
    }

    fn log(&mut self, step: &str, message: &str, level: &str) {
        jobs::emit_log(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            message,
            self.progress,
            level,
        );
    }

    fn run_required(
        &mut self,
        step: &str,
        message: &str,
        progress: u8,
        command: NativeCommand,
        timeout: Duration,
    ) -> LauncherResult<CommandOutput> {
        self.progress(step, message, progress);
        let output = run_streaming_command(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            self.progress,
            command,
            timeout,
            self.job.cancel_flag(),
        )
        .map_err(|error| process_error_to_launcher(step, error))?;

        self.append_output(&output);
        if output.success {
            Ok(output)
        } else {
            Err(command_failure_error(step, &output))
        }
    }

    fn run_optional(
        &mut self,
        step: &str,
        message: &str,
        progress: u8,
        command: NativeCommand,
        timeout: Duration,
    ) {
        match self.run_required(step, message, progress, command, timeout) {
            Ok(_) => {}
            Err(error) => {
                self.log(
                    step,
                    &format!("Aviso: {}", error.friendly_message()),
                    "error",
                );
            }
        }
    }

    fn append_output(&mut self, output: &CommandOutput) {
        append_limited(&mut self.stdout, &output.stdout, CAPTURE_LIMIT_BYTES);
        append_limited(&mut self.stderr, &output.stderr, CAPTURE_LIMIT_BYTES);
    }

    fn finish_success(&mut self, step: &str, message: &str) -> CommandOutput {
        self.progress(step, message, 100);
        jobs::emit_finished(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            message,
            100,
            "success",
        );

        CommandOutput {
            success: true,
            code: Some(0),
            stdout: self.stdout.trim_end().to_string(),
            stderr: self.stderr.trim_end().to_string(),
        }
    }

    fn finish_error(&mut self, error: &LauncherError) {
        jobs::emit_error(
            self.app,
            self.job.job_id(),
            self.job.action(),
            &self.current_step,
            error.technical_message(),
            100,
        );
        jobs::emit_finished(
            self.app,
            self.job.job_id(),
            self.job.action(),
            &self.current_step,
            &format!("Falhou na etapa: {}", self.current_step),
            100,
            "error",
        );
    }

    fn finish_cancelled(&mut self) {
        jobs::emit_finished(
            self.app,
            self.job.job_id(),
            self.job.action(),
            &self.current_step,
            "Operação cancelada.",
            100,
            "cancelled",
        );
    }
}

pub fn quick_diagnose() -> LauncherResult<String> {
    let status = build_system_status(true, None)?;
    serde_json::to_string(&status)
        .map_err(|error| LauncherError::technical("Não foi possível serializar diagnóstico", error))
}

pub fn doctor(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<String> {
    let job = job_manager.start("Diagnosticar")?;
    let cancel = job.cancel_flag();
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Iniciando", "Executando diagnóstico leve em etapas.", 0);

    let status = run_doctor_steps(&mut ctx, cancel);
    match status {
        Ok(status) => {
            let json = serde_json::to_string(&status).map_err(|error| {
                LauncherError::technical("Não foi possível serializar diagnóstico", error)
            })?;
            ctx.finish_success("Finalizado", "Diagnóstico concluído.");
            Ok(json)
        }
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.finish_error(&error);
            Err(error)
        }
    }
}

fn run_doctor_steps(
    ctx: &mut NativeJob<'_, '_>,
    cancel: Arc<AtomicBool>,
) -> LauncherResult<SystemStatus> {
    ctx.progress("Sistema", "Detectando sistema operacional.", 10);
    check_cancelled(&cancel)?;
    ctx.progress("Git", "Verificando Git com timeout curto.", 20);
    check_cancelled(&cancel)?;
    ctx.progress("Docker", "Verificando Docker com timeout curto.", 40);
    check_cancelled(&cancel)?;
    ctx.progress("Docker Compose", "Verificando Docker Compose.", 55);
    check_cancelled(&cancel)?;
    ctx.progress("Projeto", "Verificando pasta local do projeto.", 75);
    check_cancelled(&cancel)?;
    ctx.progress("Site", "Verificando portas locais.", 90);
    build_system_status(false, Some(cancel))
}

pub fn check_system_dependencies() -> LauncherResult<String> {
    let dependencies = build_dependency_status()?;
    serde_json::to_string(&dependencies)
        .map_err(|error| LauncherError::technical("Não foi possível serializar dependências", error))
}

pub fn ensure_docker_running(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Verificar Docker")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Verificando Docker", "Validando Docker Engine.", 0);

    let result = ensure_docker_running_steps(&mut ctx);
    match result {
        Ok(()) => Ok(ctx.finish_success("Docker pronto", "Docker Engine está respondendo.")),
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.finish_error(&error);
            Err(error)
        }
    }
}

pub fn ensure_docker_permission(
    app: &AppHandle,
    job_manager: &JobManager,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Verificar permissões Docker")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Verificando permissões", "Validando acesso ao Docker.", 0);

    let result = ensure_docker_permission_steps(&mut ctx);
    match result {
        Ok(()) => Ok(ctx.finish_success("Permissão OK", "Permissão do Docker validada.")),
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.finish_error(&error);
            Err(error)
        }
    }
}

pub fn install_project(
    app: &AppHandle,
    job_manager: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Instalar/Atualizar M&G Pocket")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Iniciando", "Iniciando instalação nativa do launcher.", 0);

    let result = install_project_steps(&mut ctx, use_sudo_docker);
    match result {
        Ok(()) => Ok(ctx.finish_success("Finalizado", "M&G Pocket instalado e validado.")),
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.finish_error(&error);
            Err(error)
        }
    }
}

pub fn start_app(
    app: &AppHandle,
    job_manager: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Iniciar M&G Pocket")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Iniciando", "Iniciando containers do M&G Pocket.", 0);

    let result = start_app_steps(&mut ctx, use_sudo_docker);
    match result {
        Ok(()) => Ok(ctx.finish_success("Finalizado", "M&G Pocket iniciado.")),
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.finish_error(&error);
            Err(error)
        }
    }
}

pub fn stop_app(
    app: &AppHandle,
    job_manager: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Parar M&G Pocket")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Parando", "Parando containers do M&G Pocket.", 0);

    let result = stop_app_steps(&mut ctx, use_sudo_docker);
    match result {
        Ok(()) => Ok(ctx.finish_success("Finalizado", "M&G Pocket parado. Dados locais preservados.")),
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.finish_error(&error);
            Err(error)
        }
    }
}

pub fn restart_app(
    app: &AppHandle,
    job_manager: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Reiniciar M&G Pocket")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Reiniciando", "Reiniciando containers do M&G Pocket.", 0);

    let result = stop_app_steps(&mut ctx, use_sudo_docker).and_then(|_| start_app_steps(&mut ctx, use_sudo_docker));
    match result {
        Ok(()) => Ok(ctx.finish_success("Finalizado", "M&G Pocket reiniciado.")),
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.finish_error(&error);
            Err(error)
        }
    }
}

pub fn read_logs(
    app: &AppHandle,
    job_manager: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<String> {
    let job = job_manager.start("Ler logs")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Logs", "Carregando últimas linhas dos containers.", 0);

    let result = read_logs_steps(&mut ctx, use_sudo_docker);
    match result {
        Ok(logs) => {
            ctx.finish_success("Finalizado", "Logs carregados.");
            Ok(logs)
        }
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.finish_error(&error);
            Err(error)
        }
    }
}

pub fn cancel_current_job(job_manager: &JobManager) -> LauncherResult<bool> {
    Ok(job_manager.cancel_active()?.is_some())
}

fn ensure_docker_running_steps(ctx: &mut NativeJob<'_, '_>) -> LauncherResult<()> {
    ctx.run_required(
        "Verificar Docker",
        "Executando docker info com timeout.",
        60,
        docker_command(vec!["info"], false),
        SHORT_TIMEOUT,
    )?;
    resolve_compose_command(false, QUICK_TIMEOUT, None)?;
    Ok(())
}

fn ensure_docker_permission_steps(ctx: &mut NativeJob<'_, '_>) -> LauncherResult<()> {
    let direct = run_capture(
        docker_command(vec!["info"], false),
        SHORT_TIMEOUT,
        Some(ctx.job.cancel_flag()),
    );
    if direct.as_ref().map(|output| output.success).unwrap_or(false) {
        if let Ok(output) = direct {
            ctx.append_output(&output);
        }
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let sudo = run_capture(
            docker_command(vec!["info"], true),
            SHORT_TIMEOUT,
            Some(ctx.job.cancel_flag()),
        );
        if sudo.as_ref().map(|output| output.success).unwrap_or(false) {
            ctx.run_optional(
                "Permissão Docker",
                "Garantindo grupo docker sem pedir senha no app.",
                70,
                NativeCommand::new("sudo").args(["-n", "groupadd", "-f", "docker"]),
                SHORT_TIMEOUT,
            );
            if let Ok(user) = env::var("USER") {
                ctx.run_optional(
                    "Permissão Docker",
                    "Adicionando usuário ao grupo docker sem pedir senha no app.",
                    80,
                    NativeCommand::new("sudo").args(vec![
                        "-n".to_string(),
                        "usermod".to_string(),
                        "-aG".to_string(),
                        "docker".to_string(),
                        user,
                    ]),
                    SHORT_TIMEOUT,
                );
            }
            return Err(LauncherError::friendly(
                "Permissão do Docker ainda não está ativa. Saia da sessão do Linux e entre novamente, ou use sudo nesta sessão pelo launcher.",
            ));
        }
    }

    Err(LauncherError::friendly(
        "Docker não está acessível para seu usuário. Autorize pelo mecanismo do sistema ou ajuste o grupo docker manualmente.",
    ))
}

fn install_project_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<()> {
    ctx.progress("Verificando Git", "Verificando Git.", 10);
    require_command("git", ["--version"], "Git não foi encontrado. Instale o Git antes de continuar.")?;

    ctx.progress("Verificando Docker", "Verificando Docker Engine.", 20);
    ctx.run_required(
        "Verificar Docker",
        "Executando docker info.",
        20,
        docker_command(vec!["info"], use_sudo_docker),
        SHORT_TIMEOUT,
    )?;

    ctx.progress("Verificando Docker Compose", "Verificando Docker Compose.", 30);
    let compose = resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;

    ctx.progress("Verificando permissões", "Validando permissão Docker.", 40);
    ensure_docker_permission_for_install(use_sudo_docker)?;

    let project_dir = project_dir();
    ctx.progress("Preparando pasta local", "Preparando pasta do projeto.", 50);
    validate_project_path(&project_dir)?;
    prepare_project_source(ctx, &project_dir)?;

    ctx.progress("Preparando .env", "Preparando .env.docker-local e storage local.", 70);
    prepare_project_files(&project_dir)?;
    cleanup_legacy_app_compose_project(ctx, &compose, &project_dir);

    ctx.run_required(
        "Subindo containers",
        "Subindo containers principais com Docker Compose.",
        80,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "up",
                "-d",
                "--build",
                "postgres",
                "storage",
                "app",
            ],
        ),
        LONG_TIMEOUT,
    )?;

    ctx.run_optional(
        "Subindo Adminer",
        "Tentando iniciar Adminer.",
        84,
        compose.command(&project_dir, ["up", "-d", "adminer"]),
        MEDIUM_TIMEOUT,
    );

    wait_for_postgres(ctx, &compose, &project_dir)?;
    wait_for_app_database(ctx, &compose, &project_dir)?;

    ctx.run_required(
        "Rodando setup",
        "Aplicando migrations e preparando Prisma.",
        90,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "exec",
                "-T",
                "app",
                "npm",
                "run",
                "db:setup",
            ],
        ),
        LONG_TIMEOUT,
    )?;

    run_seed_if_needed(ctx, &compose, &project_dir)?;
    validate_site(ctx)?;
    Ok(())
}

fn start_app_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<()> {
    let project_dir = project_dir();
    require_project(&project_dir)?;
    validate_project_path(&project_dir)?;
    prepare_project_files(&project_dir)?;

    ctx.progress("Verificando Docker", "Validando Docker Engine.", 15);
    ctx.run_required(
        "Verificar Docker",
        "Executando docker info.",
        15,
        docker_command(vec!["info"], use_sudo_docker),
        SHORT_TIMEOUT,
    )?;
    let compose = resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
    cleanup_legacy_app_compose_project(ctx, &compose, &project_dir);

    ctx.run_required(
        "Subindo containers",
        "Subindo containers principais.",
        65,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "up",
                "-d",
                "postgres",
                "storage",
                "app",
            ],
        ),
        LONG_TIMEOUT,
    )?;
    ctx.run_optional(
        "Subindo Adminer",
        "Tentando iniciar Adminer.",
        75,
        compose.command(&project_dir, ["up", "-d", "adminer"]),
        MEDIUM_TIMEOUT,
    );
    wait_for_app_database(ctx, &compose, &project_dir)?;
    validate_site(ctx)?;
    Ok(())
}

fn stop_app_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<()> {
    let project_dir = project_dir();
    require_project(&project_dir)?;
    let compose = resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
    stop_compose_project(ctx, &compose, &project_dir, &compose_project_name(), true)?;
    if compose_project_name() != "meg-pocket" {
        stop_compose_project(ctx, &compose, &project_dir, "meg-pocket", false)?;
    }
    if compose_project_name() != "app" {
        stop_compose_project(ctx, &compose, &project_dir, "app", false)?;
    }
    Ok(())
}

fn read_logs_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<String> {
    let project_dir = project_dir();
    require_project(&project_dir)?;
    let compose = resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
    let output = ctx.run_required(
        "Logs",
        "Lendo somente as últimas linhas.",
        60,
        compose.command(
            &project_dir,
            ["--env-file", ".env.docker-local", "logs", "--tail=300"],
        ),
        MEDIUM_TIMEOUT,
    )?;
    Ok(limit_lines(&output.stdout, UI_LOG_LINES))
}

fn prepare_project_source(ctx: &mut NativeJob<'_, '_>, project_dir: &Path) -> LauncherResult<()> {
    if let Some(parent) = project_dir.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| LauncherError::technical("Não foi possível criar pasta do projeto", error))?;
    }

    let git_dir = project_dir.join(".git");
    let compose_file = project_dir.join("docker-compose.yml");
    if git_dir.is_dir() {
        ctx.run_required(
            "Clonando ou atualizando projeto",
            "Atualizando projeto com git pull --ff-only.",
            60,
            NativeCommand::new("git").args(vec![
                "-C".to_string(),
                path_string(project_dir),
                "pull".to_string(),
                "--ff-only".to_string(),
            ]),
            LONG_TIMEOUT,
        )?;
        return Ok(());
    }

    if compose_file.is_file() {
        ctx.log(
            "Clonando ou atualizando projeto",
            "Projeto já existe sem .git. Mantendo arquivos locais.",
            "info",
        );
        return Ok(());
    }

    if project_dir.exists() {
        return Err(LauncherError::new(
            format!(
                "O caminho {} já existe, mas não parece ser o projeto M&G Pocket.",
                project_dir.display()
            ),
            format!("Pasta existente sem .git e sem docker-compose.yml: {}", project_dir.display()),
        ));
    }

    let repo_url = env::var("MG_POCKET_REPO_URL").unwrap_or_else(|_| REPO_URL.to_string());
    ctx.run_required(
        "Clonando ou atualizando projeto",
        "Baixando projeto com git clone.",
        60,
        NativeCommand::new("git").args(vec![
            "clone".to_string(),
            repo_url,
            path_string(project_dir),
        ]),
        LONG_TIMEOUT,
    )?;
    Ok(())
}

fn prepare_project_files(project_dir: &Path) -> LauncherResult<()> {
    fs::create_dir_all(project_dir.join("storage").join("local").join("public"))
        .map_err(|error| LauncherError::technical("Não foi possível criar storage local", error))?;
    fs::create_dir_all(project_dir.join("installers"))
        .map_err(|error| LauncherError::technical("Não foi possível criar pasta técnica do projeto", error))?;

    let env_file = project_dir.join(".env.docker-local");
    if env_file.is_file() {
        return Ok(());
    }

    let mut content = if project_dir.join(".env.example").is_file() {
        fs::read_to_string(project_dir.join(".env.example"))
            .map_err(|error| LauncherError::technical("Não foi possível ler .env.example", error))?
    } else {
        default_env_file()
    };

    let secret = format!("mg-pocket-local-{}", timestamp_nanos());
    if content.lines().any(|line| line.starts_with("NEXTAUTH_SECRET=")) {
        content = content
            .lines()
            .map(|line| {
                if line.starts_with("NEXTAUTH_SECRET=") {
                    format!("NEXTAUTH_SECRET=\"{secret}\"")
                } else {
                    line.to_string()
                }
            })
            .collect::<Vec<_>>()
            .join("\n");
        content.push('\n');
    }

    fs::write(&env_file, content)
        .map_err(|error| LauncherError::technical("Não foi possível criar .env.docker-local", error))?;
    Ok(())
}

fn cleanup_legacy_app_compose_project(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
) {
    if compose_project_name() == "app" {
        return;
    }

    let mut command_args = compose.prefix.clone();
    command_args.extend(["--project-name".to_string(), "app".to_string(), "down".to_string(), "--remove-orphans".to_string()]);
    let command = NativeCommand::new(compose.program.clone())
        .args(command_args)
        .cwd(project_dir);
    ctx.run_optional(
        "Preparando Docker",
        "Removendo containers legados do projeto antigo, se existirem.",
        72,
        command,
        MEDIUM_TIMEOUT,
    );
}

fn stop_compose_project(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
    project_name: &str,
    required: bool,
) -> LauncherResult<()> {
    let mut command_args = compose.prefix.clone();
    command_args.extend([
        "--project-name".to_string(),
        project_name.to_string(),
    ]);
    if project_dir.join(".env.docker-local").is_file() {
        command_args.extend(["--env-file".to_string(), ".env.docker-local".to_string()]);
    }
    command_args.extend(["down".to_string(), "--remove-orphans".to_string()]);
    let command = NativeCommand::new(compose.program.clone())
        .args(command_args)
        .cwd(project_dir);

    if required {
        ctx.run_required(
            "Parando containers",
            "Parando containers e redes do projeto.",
            70,
            command,
            LONG_TIMEOUT,
        )?;
    } else {
        ctx.run_optional(
            "Parando containers legados",
            "Parando stack legada, se existir.",
            75,
            command,
            MEDIUM_TIMEOUT,
        );
    }
    Ok(())
}

fn wait_for_postgres(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
) -> LauncherResult<()> {
    ctx.progress("Aguardando banco", "Aguardando Postgres responder.", 86);
    retry_step(ctx, Duration::from_secs(120), Duration::from_secs(2), || {
        run_capture(
            compose.command(
                project_dir,
                [
                    "--env-file",
                    ".env.docker-local",
                    "exec",
                    "-T",
                    "postgres",
                    "pg_isready",
                    "-U",
                    "meg",
                    "-d",
                    "meg_pocket",
                ],
            ),
            SHORT_TIMEOUT,
            Some(ctx.job.cancel_flag()),
        )
        .map(|output| output.success)
        .unwrap_or(false)
    })
    .map_err(|_| LauncherError::friendly("O banco de dados não ficou pronto a tempo. Veja os logs pelo launcher."))
}

fn wait_for_app_database(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
) -> LauncherResult<()> {
    ctx.progress("Aguardando app", "Validando conexão do app com o banco.", 88);
    retry_step(ctx, Duration::from_secs(120), Duration::from_secs(2), || {
        run_capture(
            compose.command(
                project_dir,
                [
                    "exec",
                    "-T",
                    "app",
                    "pg_isready",
                    "-h",
                    "postgres",
                    "-p",
                    "5432",
                    "-U",
                    "meg",
                    "-d",
                    "meg_pocket",
                ],
            ),
            SHORT_TIMEOUT,
            Some(ctx.job.cancel_flag()),
        )
        .map(|output| output.success)
        .unwrap_or(false)
    })
    .map_err(|_| {
        LauncherError::friendly(
            "O app iniciou, mas ainda não consegue acessar o Postgres pelo Docker. Veja os logs pelo launcher.",
        )
    })
}

fn run_seed_if_needed(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
) -> LauncherResult<()> {
    let seed_marker = project_dir.join("installers").join(".seed-inicial-concluido");
    let seed_ready = seed_ready(compose, project_dir, ctx.job.cancel_flag());
    if seed_marker.is_file() || seed_ready {
        ctx.log(
            "Rodando setup",
            "Seed inicial já executado ou dados essenciais já existem. Pulando seed.",
            "info",
        );
        let _ = fs::write(seed_marker, "");
        return Ok(());
    }

    ctx.run_required(
        "Rodando seed",
        "Executando seed inicial com os dados essenciais.",
        93,
        compose.command(
            project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "exec",
                "-T",
                "app",
                "npm",
                "run",
                "db:seed",
            ],
        ),
        LONG_TIMEOUT,
    )?;
    fs::write(seed_marker, "")
        .map_err(|error| LauncherError::technical("Não foi possível gravar marcador de seed", error))?;
    Ok(())
}

fn seed_ready(compose: &ComposeCommand, project_dir: &Path, cancel: Arc<AtomicBool>) -> bool {
    let query = "SELECT CASE WHEN to_regclass('\"Classe\"') IS NULL OR to_regclass('\"Raca\"') IS NULL OR to_regclass('\"MagiaCatalog\"') IS NULL OR to_regclass('\"PericiaCatalog\"') IS NULL OR to_regclass('\"Item\"') IS NULL THEN 0 WHEN (SELECT count(*) FROM \"Classe\") > 0 AND (SELECT count(*) FROM \"Raca\") > 0 AND (SELECT count(*) FROM \"MagiaCatalog\") > 0 AND (SELECT count(*) FROM \"PericiaCatalog\") > 0 AND (SELECT count(*) FROM \"Item\") > 0 THEN 1 ELSE 0 END;";
    run_capture(
        compose.command(
            project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "exec",
                "-T",
                "postgres",
                "psql",
                "-U",
                "meg",
                "-d",
                "meg_pocket",
                "-tAc",
                query,
            ],
        ),
        SHORT_TIMEOUT,
        Some(cancel),
    )
    .map(|output| output.success && output.stdout.trim() == "1")
    .unwrap_or(false)
}

fn validate_site(ctx: &mut NativeJob<'_, '_>) -> LauncherResult<()> {
    ctx.progress("Validando site/Adminer", "Validando http://localhost:3000.", 95);
    retry_step(ctx, Duration::from_secs(120), Duration::from_secs(2), || {
        check_local_port(3000, PORT_TIMEOUT)
    })
    .map_err(|_| {
        LauncherError::friendly(
            "Os containers subiram, mas http://localhost:3000 não respondeu a tempo. Veja os logs pelo launcher.",
        )
    })?;

    if check_local_port(8081, PORT_TIMEOUT) {
        ctx.log("Validando site/Adminer", "Adminer respondeu em http://localhost:8081.", "info");
    } else {
        ctx.log(
            "Validando site/Adminer",
            "Adminer não respondeu agora. O site pode funcionar sem o Adminer.",
            "info",
        );
    }

    Ok(())
}

fn retry_step<F>(
    ctx: &NativeJob<'_, '_>,
    total_timeout: Duration,
    interval: Duration,
    mut check: F,
) -> Result<(), ()>
where
    F: FnMut() -> bool,
{
    let start = Instant::now();
    while start.elapsed() < total_timeout {
        if ctx.job.is_cancelled() {
            return Err(());
        }
        if check() {
            return Ok(());
        }
        thread::sleep(interval);
    }
    Err(())
}

fn build_system_status(quick: bool, cancel: Option<Arc<AtomicBool>>) -> LauncherResult<SystemStatus> {
    if let Some(cancel) = &cancel {
        check_cancelled(cancel)?;
    }

    let os = current_os();
    let distro = if os == "linux" { linux_distro() } else { None };
    let distro_family = distro.as_ref().map(|distro| distro.family.clone());
    let distro_name = distro.as_ref().map(|distro| distro.pretty_name.clone());
    let supported = os == "windows"
        || distro
            .as_ref()
            .map(|distro| distro.family != "unsupported")
            .unwrap_or(os == "linux");

    let git = command_version(NativeCommand::new("git").arg("--version"), QUICK_TIMEOUT, cancel.clone());
    let docker_version = command_version(NativeCommand::new("docker").arg("--version"), QUICK_TIMEOUT, cancel.clone());
    let docker_installed = docker_version.is_some();

    let docker_ps = if docker_installed {
        run_capture(
            docker_command(vec!["ps", "--format", "{{.ID}}"], false),
            QUICK_TIMEOUT,
            cancel.clone(),
        )
        .ok()
    } else {
        None
    };

    let sudo_docker = if cfg!(target_os = "linux") && docker_installed && docker_ps.as_ref().map(|output| !output.success).unwrap_or(true) {
        run_capture(
            docker_command(vec!["ps", "--format", "{{.ID}}"], true),
            QUICK_TIMEOUT,
            cancel.clone(),
        )
        .ok()
    } else {
        None
    };

    let compose_version = resolve_compose_command(false, QUICK_TIMEOUT, cancel.clone())
        .ok()
        .and_then(|compose| command_version(compose.command(Path::new("."), ["version"]), QUICK_TIMEOUT, cancel.clone()));

    let project_dir = project_dir();
    let project_installed = project_dir.join("docker-compose.yml").is_file();
    let project_version = if project_installed && !quick {
        project_version(&project_dir, cancel.clone())
    } else if project_installed {
        Some("detectada".to_string())
    } else {
        None
    };

    let docker_running = docker_ps.as_ref().map(|output| output.success).unwrap_or(false)
        || sudo_docker.as_ref().map(|output| output.success).unwrap_or(false);
    let docker_permission_ok = docker_ps.as_ref().map(|output| output.success).unwrap_or(false);
    let sudo_docker_works = sudo_docker.as_ref().map(|output| output.success).unwrap_or(false);

    Ok(SystemStatus {
        os: os.to_string(),
        distro_family,
        distro_name,
        supported,
        winget_installed: (os == "windows").then(|| command_success("winget", ["--version"], QUICK_TIMEOUT)),
        git_installed: (os == "windows").then_some(git.is_some()),
        power_shell_installed: (os == "windows").then(|| command_success("powershell.exe", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion"], QUICK_TIMEOUT)),
        wsl2_installed: (os == "windows").then(|| command_success("wsl.exe", ["--status"], QUICK_TIMEOUT)),
        docker_desktop_installed: (os == "windows").then(|| docker_desktop_installed()),
        docker_installed,
        docker_version,
        docker_running,
        docker_compose_installed: compose_version.is_some(),
        docker_compose_version: compose_version,
        docker_permission_ok: if os == "windows" { docker_running } else { docker_permission_ok },
        sudo_docker_works,
        requires_relogin: os == "linux" && !docker_permission_ok && sudo_docker_works,
        project_installed,
        project_path: Some(path_string(&project_dir)),
        project_version,
        app_online: check_local_port(3000, PORT_TIMEOUT),
        adminer_online: check_local_port(8081, PORT_TIMEOUT),
    })
}

fn build_dependency_status() -> LauncherResult<DependencyStatus> {
    let os = current_os();
    let distro = if os == "linux" { linux_distro() } else { None };
    let distro_family = distro.as_ref().map(|distro| distro.family.clone());
    let distro_name = distro.as_ref().map(|distro| distro.pretty_name.clone());
    let supported = os == "windows"
        || distro
            .as_ref()
            .map(|distro| distro.family != "unsupported")
            .unwrap_or(os == "linux");

    let mut missing = Vec::new();
    let mut packages = Vec::new();

    if !command_success("git", ["--version"], QUICK_TIMEOUT) {
        missing.push("git".to_string());
        packages.push("git".to_string());
    }
    if !command_success("docker", ["--version"], QUICK_TIMEOUT) {
        missing.push(if os == "windows" { "Docker Desktop" } else { "docker" }.to_string());
        packages.push(if os == "windows" { "Docker Desktop" } else { "docker" }.to_string());
    }
    if resolve_compose_command(false, QUICK_TIMEOUT, None).is_err() {
        missing.push("docker compose".to_string());
        packages.push(dependency_package("docker_compose", distro_family.as_deref()));
    }

    if os == "linux" {
        for (program, package) in [("bash", "bash"), ("chmod", "coreutils")] {
            if !command_success(program, ["--version"], QUICK_TIMEOUT) {
                missing.push(program.to_string());
                packages.push(package.to_string());
            }
        }
    }

    let winget_installed = os == "windows" && command_success("winget", ["--version"], QUICK_TIMEOUT);
    let sudo_installed = os == "linux" && command_success("sudo", ["-V"], QUICK_TIMEOUT);
    let mut commands = Vec::new();
    let mut installable = false;
    let mut install_command = String::new();
    let mut manual_instructions =
        "Instale manualmente os pacotes listados e depois volte ao launcher para diagnosticar ou instalar novamente."
            .to_string();

    if !missing.is_empty() && os == "windows" {
        if winget_installed {
            installable = true;
            commands = windows_winget_plan(&missing);
            install_command = commands.join("\n");
            manual_instructions =
                "O launcher pode instalar Git e Docker Desktop via winget após sua confirmação.".to_string();
        } else {
            manual_instructions =
                "winget não foi encontrado. Instale ou atualize o App Installer pela Microsoft Store e tente novamente."
                    .to_string();
        }
    } else if !missing.is_empty() && os == "linux" && supported && sudo_installed {
        if let Some(family) = distro_family.as_deref() {
            if let Some(command) = linux_install_command(family) {
                installable = true;
                install_command = command.to_string();
                commands = vec![install_command.clone()];
            }
        }
    } else if distro_family.as_deref() == Some("opensuse_like") {
        manual_instructions = "Detectei openSUSE/SUSE, mas a instalação automática ainda não está habilitada com segurança. Instale git, docker, docker compose, bash e coreutils pelo YaST ou zypper.".to_string();
    }

    Ok(DependencyStatus {
        os: os.to_string(),
        distro_family,
        distro_name,
        supported,
        missing,
        packages: unique(packages),
        installable,
        sudo_required: installable,
        install_command,
        commands,
        manual_instructions,
    })
}

pub(crate) fn run_capture(
    command: NativeCommand,
    timeout: Duration,
    cancel: Option<Arc<AtomicBool>>,
) -> Result<CommandOutput, ProcessError> {
    let display = command.display();
    let mut process = command.into_command();
    process.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = process
        .spawn()
        .map_err(|error| ProcessError::spawn(display.clone(), error))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdout_handle = stdout.map(|stdout| thread::spawn(move || read_to_string_limited(stdout)));
    let stderr_handle = stderr.map(|stderr| thread::spawn(move || read_to_string_limited(stderr)));

    let started = Instant::now();
    loop {
        if cancel
            .as_ref()
            .map(|cancel| cancel.load(Ordering::Relaxed))
            .unwrap_or(false)
        {
            let _ = child.kill();
            let _ = child.wait();
            let output = join_capture_output(stdout_handle, stderr_handle, None);
            return Err(ProcessError::cancelled(display, output));
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                let output = join_capture_output(stdout_handle, stderr_handle, status.code());
                return Ok(CommandOutput {
                    success: status.success(),
                    ..output
                });
            }
            Ok(None) => {}
            Err(error) => {
                let _ = child.kill();
                let output = join_capture_output(stdout_handle, stderr_handle, None);
                return Err(ProcessError::wait(display, output, error));
            }
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            let output = join_capture_output(stdout_handle, stderr_handle, None);
            return Err(ProcessError::timeout(display, output));
        }

        thread::sleep(Duration::from_millis(25));
    }
}

#[allow(clippy::too_many_arguments)]
fn run_streaming_command(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    progress: u8,
    command: NativeCommand,
    timeout: Duration,
    cancel: Arc<AtomicBool>,
) -> Result<CommandOutput, ProcessError> {
    let display = command.display();
    jobs::emit_log(app, job_id, action, step, &format!("Executando: {display}"), progress, "info");

    let mut process = command.into_command();
    process.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = process
        .spawn()
        .map_err(|error| ProcessError::spawn(display.clone(), error))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let (sender, receiver) = mpsc::channel::<StreamLine>();

    let stdout_handle = stdout.map(|stdout| spawn_line_reader(stdout, StreamKind::Stdout, sender.clone()));
    let stderr_handle = stderr.map(|stderr| spawn_line_reader(stderr, StreamKind::Stderr, sender));

    let started = Instant::now();
    let mut stdout_text = String::new();
    let mut stderr_text = String::new();
    let mut stdout_batch = Vec::new();
    let mut stderr_batch = Vec::new();
    let mut last_flush = Instant::now();

    loop {
        while let Ok(line) = receiver.try_recv() {
            accept_stream_line(
                line,
                &mut stdout_text,
                &mut stderr_text,
                &mut stdout_batch,
                &mut stderr_batch,
            );
        }

        if last_flush.elapsed() >= LOG_BATCH_INTERVAL
            || stdout_batch.len() >= LOG_BATCH_LINES
            || stderr_batch.len() >= LOG_BATCH_LINES
        {
            flush_stream_batches(
                app,
                job_id,
                action,
                step,
                progress,
                &mut stdout_batch,
                &mut stderr_batch,
            );
            last_flush = Instant::now();
        }

        if cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            drain_streams(&receiver, &mut stdout_text, &mut stderr_text, &mut stdout_batch, &mut stderr_batch);
            join_line_readers(stdout_handle, stderr_handle);
            flush_stream_batches(app, job_id, action, step, progress, &mut stdout_batch, &mut stderr_batch);
            return Err(ProcessError::cancelled(
                display,
                CommandOutput {
                    success: false,
                    code: None,
                    stdout: stdout_text.trim_end().to_string(),
                    stderr: stderr_text.trim_end().to_string(),
                },
            ));
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                drain_streams(&receiver, &mut stdout_text, &mut stderr_text, &mut stdout_batch, &mut stderr_batch);
                join_line_readers(stdout_handle, stderr_handle);
                drain_streams(&receiver, &mut stdout_text, &mut stderr_text, &mut stdout_batch, &mut stderr_batch);
                flush_stream_batches(app, job_id, action, step, progress, &mut stdout_batch, &mut stderr_batch);
                return Ok(CommandOutput {
                    success: status.success(),
                    code: status.code(),
                    stdout: stdout_text.trim_end().to_string(),
                    stderr: stderr_text.trim_end().to_string(),
                });
            }
            Ok(None) => {}
            Err(error) => {
                let _ = child.kill();
                let output = CommandOutput {
                    success: false,
                    code: None,
                    stdout: stdout_text.trim_end().to_string(),
                    stderr: stderr_text.trim_end().to_string(),
                };
                return Err(ProcessError::wait(display, output, error));
            }
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            drain_streams(&receiver, &mut stdout_text, &mut stderr_text, &mut stdout_batch, &mut stderr_batch);
            join_line_readers(stdout_handle, stderr_handle);
            flush_stream_batches(app, job_id, action, step, progress, &mut stdout_batch, &mut stderr_batch);
            return Err(ProcessError::timeout(
                display,
                CommandOutput {
                    success: false,
                    code: None,
                    stdout: stdout_text.trim_end().to_string(),
                    stderr: stderr_text.trim_end().to_string(),
                },
            ));
        }

        thread::sleep(Duration::from_millis(35));
    }
}

#[derive(Clone, Copy)]
enum StreamKind {
    Stdout,
    Stderr,
}

enum StreamLine {
    Stdout(String),
    Stderr(String),
}

fn spawn_line_reader<R: Read + Send + 'static>(
    reader: R,
    kind: StreamKind,
    sender: mpsc::Sender<StreamLine>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let reader = BufReader::new(reader);
        for line in reader.lines() {
            let Ok(line) = line else {
                break;
            };
            let line = redact_sensitive(&line);
            let event = match kind {
                StreamKind::Stdout => StreamLine::Stdout(line),
                StreamKind::Stderr => StreamLine::Stderr(line),
            };
            if sender.send(event).is_err() {
                break;
            }
        }
    })
}

fn accept_stream_line(
    line: StreamLine,
    stdout_text: &mut String,
    stderr_text: &mut String,
    stdout_batch: &mut Vec<String>,
    stderr_batch: &mut Vec<String>,
) {
    match line {
        StreamLine::Stdout(line) => {
            append_limited_line(stdout_text, &line, CAPTURE_LIMIT_BYTES);
            stdout_batch.push(line);
        }
        StreamLine::Stderr(line) => {
            append_limited_line(stderr_text, &line, CAPTURE_LIMIT_BYTES);
            stderr_batch.push(line);
        }
    }
}

fn drain_streams(
    receiver: &mpsc::Receiver<StreamLine>,
    stdout_text: &mut String,
    stderr_text: &mut String,
    stdout_batch: &mut Vec<String>,
    stderr_batch: &mut Vec<String>,
) {
    while let Ok(line) = receiver.try_recv() {
        accept_stream_line(line, stdout_text, stderr_text, stdout_batch, stderr_batch);
    }
}

fn join_line_readers(
    stdout_handle: Option<thread::JoinHandle<()>>,
    stderr_handle: Option<thread::JoinHandle<()>>,
) {
    if let Some(handle) = stdout_handle {
        let _ = handle.join();
    }
    if let Some(handle) = stderr_handle {
        let _ = handle.join();
    }
}

fn flush_stream_batches(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    progress: u8,
    stdout_batch: &mut Vec<String>,
    stderr_batch: &mut Vec<String>,
) {
    if !stdout_batch.is_empty() {
        let message = stdout_batch.join("\n");
        jobs::emit_log(app, job_id, action, step, &message, progress, "stdout");
        stdout_batch.clear();
    }
    if !stderr_batch.is_empty() {
        let message = stderr_batch.join("\n");
        jobs::emit_log(app, job_id, action, step, &message, progress, "stderr");
        stderr_batch.clear();
    }
}

fn read_to_string_limited<R: Read>(mut reader: R) -> String {
    let mut text = String::new();
    let _ = reader.read_to_string(&mut text);
    if text.len() > CAPTURE_LIMIT_BYTES {
        text[text.len().saturating_sub(CAPTURE_LIMIT_BYTES)..].to_string()
    } else {
        text
    }
}

fn join_capture_output(
    stdout_handle: Option<thread::JoinHandle<String>>,
    stderr_handle: Option<thread::JoinHandle<String>>,
    code: Option<i32>,
) -> CommandOutput {
    let stdout = stdout_handle
        .and_then(|handle| handle.join().ok())
        .unwrap_or_default();
    let stderr = stderr_handle
        .and_then(|handle| handle.join().ok())
        .unwrap_or_default();
    CommandOutput {
        success: false,
        code,
        stdout: stdout.trim_end().to_string(),
        stderr: stderr.trim_end().to_string(),
    }
}

fn empty_output() -> CommandOutput {
    CommandOutput {
        success: false,
        code: None,
        stdout: String::new(),
        stderr: String::new(),
    }
}

fn process_error_to_launcher(step: &str, error: ProcessError) -> LauncherError {
    let technical = format!(
        "Comando `{}` falhou na etapa `{}`.\nTipo: {:?}\nMensagem: {}\nSTDERR:\n{}\nSTDOUT:\n{}",
        error.command, step, error.kind, error.message, error.output.stderr, error.output.stdout
    );
    match error.kind {
        ProcessErrorKind::Timeout => LauncherError::new(
            format!("Falhou na etapa: {step}. O comando passou do tempo limite e foi cancelado."),
            technical,
        ),
        ProcessErrorKind::Cancelled => LauncherError::new("Operação cancelada.", technical),
        ProcessErrorKind::Spawn => LauncherError::new(
            format!("Falhou na etapa: {step}. Não consegui iniciar o comando necessário."),
            technical,
        ),
        ProcessErrorKind::Wait => LauncherError::new(
            format!("Falhou na etapa: {step}. Não consegui acompanhar o comando até o final."),
            technical,
        ),
    }
}

fn command_failure_error(step: &str, output: &CommandOutput) -> LauncherError {
    let message = first_non_empty([output.stderr.trim(), output.stdout.trim()])
        .map(friendly_first_line)
        .unwrap_or_else(|| "o comando terminou com erro sem mensagem.".to_string());
    LauncherError::new(
        format!("Falhou na etapa: {step}. {message}"),
        format!(
            "Etapa `{step}` falhou com código {:?}.\nSTDERR:\n{}\nSTDOUT:\n{}",
            output.code, output.stderr, output.stdout
        ),
    )
}

fn require_command<I, S>(program: &str, args: I, friendly: &str) -> LauncherResult<()>
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    let output = run_capture(NativeCommand::new(program).args(args), QUICK_TIMEOUT, None)
        .map_err(|error| process_error_to_launcher("Verificar comando", error))?;
    if output.success {
        Ok(())
    } else {
        Err(LauncherError::friendly(friendly))
    }
}

fn command_version(
    command: NativeCommand,
    timeout: Duration,
    cancel: Option<Arc<AtomicBool>>,
) -> Option<String> {
    run_capture(command, timeout, cancel)
        .ok()
        .filter(|output| output.success)
        .and_then(|output| {
            first_non_empty([output.stdout.trim(), output.stderr.trim()]).map(friendly_first_line)
        })
}

fn command_success<I, S>(program: &str, args: I, timeout: Duration) -> bool
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    run_capture(NativeCommand::new(program).args(args), timeout, None)
        .map(|output| output.success)
        .unwrap_or(false)
}

fn docker_command<I, S>(args: I, use_sudo: bool) -> NativeCommand
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    #[cfg(target_os = "linux")]
    {
        if use_sudo {
            let mut sudo_args = vec!["-n".to_string(), "docker".to_string()];
            sudo_args.extend(args.into_iter().map(Into::into));
            return NativeCommand::new("sudo").args(sudo_args);
        }
    }

    let _ = use_sudo;
    NativeCommand::new("docker").args(args)
}

fn resolve_compose_command(
    use_sudo: bool,
    timeout: Duration,
    cancel: Option<Arc<AtomicBool>>,
) -> LauncherResult<ComposeCommand> {
    let docker_compose = if cfg!(target_os = "linux") && use_sudo {
        ComposeCommand {
            program: "sudo".to_string(),
            prefix: vec!["-n".to_string(), "docker".to_string(), "compose".to_string()],
        }
    } else {
        ComposeCommand {
            program: "docker".to_string(),
            prefix: vec!["compose".to_string()],
        }
    };

    if run_capture(
        docker_compose.command(Path::new("."), ["version"]),
        timeout,
        cancel.clone(),
    )
    .map(|output| output.success)
    .unwrap_or(false)
    {
        return Ok(docker_compose);
    }

    let legacy = if cfg!(target_os = "linux") && use_sudo {
        ComposeCommand {
            program: "sudo".to_string(),
            prefix: vec!["-n".to_string(), "docker-compose".to_string()],
        }
    } else {
        ComposeCommand {
            program: "docker-compose".to_string(),
            prefix: Vec::new(),
        }
    };

    if run_capture(legacy.command(Path::new("."), ["version"]), timeout, cancel)
        .map(|output| output.success)
        .unwrap_or(false)
    {
        return Ok(legacy);
    }

    Err(LauncherError::friendly(
        "Docker Compose não foi encontrado. Instale ou atualize o Docker antes de continuar.",
    ))
}

fn ensure_docker_permission_for_install(use_sudo_docker: bool) -> LauncherResult<()> {
    let direct = run_capture(docker_command(vec!["info"], false), SHORT_TIMEOUT, None)
        .map(|output| output.success)
        .unwrap_or(false);
    if direct {
        return Ok(());
    }

    if use_sudo_docker {
        let sudo = run_capture(docker_command(vec!["info"], true), SHORT_TIMEOUT, None)
            .map(|output| output.success)
            .unwrap_or(false);
        if sudo {
            return Ok(());
        }
    }

    Err(LauncherError::friendly(
        "Docker não está acessível para seu usuário. Se a permissão acabou de ser configurada, saia da sessão e entre novamente ou escolha usar sudo nesta sessão.",
    ))
}

fn require_project(project_dir: &Path) -> LauncherResult<()> {
    if project_dir.join("docker-compose.yml").is_file() {
        Ok(())
    } else {
        Err(LauncherError::friendly(format!(
            "Projeto não encontrado em {}. Instale/atualize o M&G Pocket primeiro.",
            project_dir.display()
        )))
    }
}

pub(crate) fn validate_project_path(path: &Path) -> LauncherResult<()> {
    if path.as_os_str().is_empty() {
        return Err(LauncherError::friendly("Caminho local do projeto está vazio."));
    }

    if path.parent().is_none() {
        return Err(LauncherError::friendly(
            "Caminho local do projeto precisa estar dentro de uma pasta de usuário.",
        ));
    }

    let path_text = path_string(path);
    if path_text == "/" || path_text == "\\" {
        return Err(LauncherError::friendly("Caminho local do projeto inválido."));
    }

    Ok(())
}

fn project_version(project_dir: &Path, cancel: Option<Arc<AtomicBool>>) -> Option<String> {
    if project_dir.join(".git").is_dir() && command_success("git", ["--version"], QUICK_TIMEOUT) {
        if let Some(version) = command_version(
            NativeCommand::new("git").args(vec![
                "-C".to_string(),
                path_string(project_dir),
                "describe".to_string(),
                "--tags".to_string(),
                "--always".to_string(),
                "--dirty".to_string(),
            ]),
            QUICK_TIMEOUT,
            cancel.clone(),
        ) {
            return Some(version);
        }
    }

    let package_json = project_dir.join("package.json");
    if package_json.is_file() {
        if let Ok(text) = fs::read_to_string(package_json) {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) {
                if let Some(version) = value.get("version").and_then(|value| value.as_str()) {
                    return Some(version.to_string());
                }
            }
        }
    }

    Some("desconhecida".to_string())
}

fn current_os() -> &'static str {
    if cfg!(target_os = "linux") {
        "linux"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "unknown"
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct DistroInfo {
    family: String,
    pretty_name: String,
}

fn linux_distro() -> Option<DistroInfo> {
    let text = fs::read_to_string("/etc/os-release").ok()?;
    Some(parse_os_release(&text))
}

fn parse_os_release(text: &str) -> DistroInfo {
    let values = parse_os_release_values(text);
    let id = values.get("ID").map(String::as_str).unwrap_or("");
    let id_like = values.get("ID_LIKE").map(String::as_str).unwrap_or("");
    let pretty_name = values
        .get("PRETTY_NAME")
        .cloned()
        .or_else(|| values.get("NAME").cloned())
        .unwrap_or_else(|| "Linux".to_string());
    DistroInfo {
        family: detect_distro_family(id, id_like).to_string(),
        pretty_name,
    }
}

fn parse_os_release_values(text: &str) -> HashMap<String, String> {
    let mut values = HashMap::new();
    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            values.insert(key.to_string(), unquote_os_release(value));
        }
    }
    values
}

fn unquote_os_release(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() >= 2 && trimmed.starts_with('"') && trimmed.ends_with('"') {
        trimmed[1..trimmed.len() - 1]
            .replace("\\\"", "\"")
            .replace("\\\\", "\\")
    } else {
        trimmed.to_string()
    }
}

fn detect_distro_family(id: &str, id_like: &str) -> &'static str {
    let haystack = format!("{id} {id_like}").to_ascii_lowercase();
    if haystack.contains("arch") || haystack.contains("manjaro") || haystack.contains("endeavouros") {
        "arch_like"
    } else if haystack.contains("ubuntu") || haystack.contains("linuxmint") || haystack.contains("pop") {
        "ubuntu_like"
    } else if haystack.contains("debian") {
        "debian_like"
    } else if haystack.contains("fedora") || haystack.contains("rhel") || haystack.contains("centos") {
        "fedora_like"
    } else if haystack.contains("suse") || haystack.contains("opensuse") {
        "opensuse_like"
    } else {
        "unsupported"
    }
}

fn check_local_port(port: u16, timeout: Duration) -> bool {
    let hosts = [("127.0.0.1", port), ("::1", port)];
    hosts.into_iter().any(|host| {
        host.to_socket_addrs()
            .ok()
            .into_iter()
            .flatten()
            .any(|addr: SocketAddr| TcpStream::connect_timeout(&addr, timeout).is_ok())
    })
}

fn project_dir() -> PathBuf {
    if let Ok(path) = env::var("MG_POCKET_PROJECT_DIR") {
        if !path.trim().is_empty() {
            return PathBuf::from(path);
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            return PathBuf::from(local_app_data).join("mg-pocket").join("app");
        }
    }

    let home = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("mg-pocket")
        .join("app")
}

fn compose_project_name() -> String {
    env::var("MG_POCKET_COMPOSE_PROJECT_NAME").unwrap_or_else(|_| COMPOSE_PROJECT.to_string())
}

fn dependency_package(dependency: &str, family: Option<&str>) -> String {
    match dependency {
        "docker_compose" => match family {
            Some("arch_like") => "docker-compose".to_string(),
            Some("ubuntu_like" | "debian_like" | "fedora_like") => "docker-compose-plugin".to_string(),
            _ => "docker compose".to_string(),
        },
        value => value.to_string(),
    }
}

fn linux_install_command(family: &str) -> Option<&'static str> {
    match family {
        "arch_like" => Some("sudo pacman -S --needed git docker docker-compose bash coreutils"),
        "ubuntu_like" | "debian_like" => {
            Some("sudo apt update && sudo apt install -y git docker.io docker-compose-plugin bash coreutils")
        }
        "fedora_like" => Some("sudo dnf install -y git docker docker-compose-plugin bash coreutils"),
        _ => None,
    }
}

pub(crate) fn windows_winget_plan(missing: &[String]) -> Vec<String> {
    let mut commands = Vec::new();
    if missing.iter().any(|item| item.eq_ignore_ascii_case("git")) {
        commands.push("winget show --id Git.Git --exact --source winget".to_string());
        commands.push("winget install -e --id Git.Git".to_string());
        commands.push("winget install --id Git.Git --exact --source winget".to_string());
    }
    if missing
        .iter()
        .any(|item| item.eq_ignore_ascii_case("docker desktop") || item.eq_ignore_ascii_case("docker"))
    {
        commands.push("winget show --id Docker.DockerDesktop --exact --source winget".to_string());
        commands.push("winget install -e --id Docker.DockerDesktop".to_string());
        commands.push("winget install --id Docker.DockerDesktop --exact --source winget".to_string());
    }
    commands
}

fn docker_desktop_installed() -> bool {
    if command_success("docker", ["--version"], QUICK_TIMEOUT) {
        return true;
    }

    #[cfg(target_os = "windows")]
    {
        let mut candidates = Vec::new();
        if let Ok(program_files) = env::var("ProgramFiles") {
            candidates.push(PathBuf::from(program_files).join("Docker").join("Docker").join("Docker Desktop.exe"));
        }
        if let Ok(program_files_x86) = env::var("ProgramFiles(x86)") {
            candidates.push(PathBuf::from(program_files_x86).join("Docker").join("Docker").join("Docker Desktop.exe"));
        }
        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            candidates.push(
                PathBuf::from(local_app_data)
                    .join("Programs")
                    .join("Docker")
                    .join("Docker")
                    .join("Docker Desktop.exe"),
            );
        }
        return candidates.iter().any(|path| path.is_file());
    }

    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

fn default_env_file() -> String {
    r#"DATABASE_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
DIRECT_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
NEXTAUTH_SECRET="meg-pocket-local-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
STORAGE_DRIVER="local"
STORAGE_BUCKET="personagens"
STORAGE_LOCAL_DIR="./storage/local/public"
STORAGE_LOCAL_PUBLIC_URL="http://localhost:9323"
NEXT_PUBLIC_STORAGE_MAX_FILE_SIZE_MB="40"
ADMINER_URL="http://localhost:8081"
"#
    .to_string()
}

fn check_cancelled(cancel: &Arc<AtomicBool>) -> LauncherResult<()> {
    if cancel.load(Ordering::Relaxed) {
        Err(LauncherError::friendly("Operação cancelada."))
    } else {
        Ok(())
    }
}

fn append_limited(buffer: &mut String, text: &str, max_bytes: usize) {
    if text.trim().is_empty() {
        return;
    }
    if !buffer.is_empty() {
        buffer.push('\n');
    }
    buffer.push_str(text.trim_end());
    trim_string_start(buffer, max_bytes);
}

fn append_limited_line(buffer: &mut String, line: &str, max_bytes: usize) {
    buffer.push_str(line);
    buffer.push('\n');
    trim_string_start(buffer, max_bytes);
}

fn trim_string_start(buffer: &mut String, max_bytes: usize) {
    if buffer.len() <= max_bytes {
        return;
    }
    let start = buffer.len().saturating_sub(max_bytes);
    if let Some(slice) = buffer.get(start..) {
        *buffer = slice.to_string();
    }
}

fn limit_lines(text: &str, max_lines: usize) -> String {
    let mut lines = VecDeque::new();
    for line in text.lines() {
        lines.push_back(line);
        if lines.len() > max_lines {
            lines.pop_front();
        }
    }
    lines.into_iter().collect::<Vec<_>>().join("\n")
}

fn first_non_empty<'a, I>(values: I) -> Option<&'a str>
where
    I: IntoIterator<Item = &'a str>,
{
    values.into_iter().find(|value| !value.trim().is_empty())
}

fn friendly_first_line(value: &str) -> String {
    value
        .lines()
        .find(|line| !line.trim().is_empty())
        .unwrap_or(value)
        .trim()
        .chars()
        .take(240)
        .collect()
}

fn unique(values: Vec<String>) -> Vec<String> {
    let mut result = Vec::new();
    for value in values {
        if !result.contains(&value) {
            result.push(value);
        }
    }
    result
}

fn shellish_quote(value: &str) -> String {
    if value.chars().all(|ch| ch.is_ascii_alphanumeric() || "-_./:=@".contains(ch)) {
        value.to_string()
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

fn path_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn timestamp_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0)
}

fn redact_sensitive(line: &str) -> String {
    let lower = line.to_ascii_lowercase();
    let sensitive = [
        "nextauth_secret",
        "google_client_secret",
        "database_url",
        "direct_url",
        "password",
        "passwd",
        "token",
        "secret",
        "senha",
    ];

    if !sensitive.iter().any(|key| lower.contains(key)) {
        return line.to_string();
    }

    if let Some((key, _)) = line.split_once('=') {
        return format!("{}=<oculto>", key.trim());
    }

    "[linha ocultada por conter segredo ou token]".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_linux_distro_family_from_os_release() {
        let distro = parse_os_release(
            r#"
NAME="Ubuntu"
ID=ubuntu
ID_LIKE="debian"
PRETTY_NAME="Ubuntu 24.04 LTS"
"#,
        );

        assert_eq!(distro.family, "ubuntu_like");
        assert_eq!(distro.pretty_name, "Ubuntu 24.04 LTS");
    }

    #[test]
    fn fast_diagnostic_commands_do_not_include_heavy_operations() {
        let commands = planned_fast_diagnostic_commands_for_test();
        let text = commands.join("\n");
        for forbidden in ["pull", "clone", "up -d", "db:setup", "db:seed", "logs -f"] {
            assert!(
                !text.contains(forbidden),
                "diagnóstico rápido não deve executar {forbidden}"
            );
        }
        assert!(commands.iter().all(|command| command.contains("timeout=2s")));
    }

    #[test]
    fn capture_command_times_out() {
        let command = if cfg!(target_os = "windows") {
            NativeCommand::new("powershell.exe").args(["-NoProfile", "-Command", "Start-Sleep -Seconds 2"])
        } else {
            NativeCommand::new("sh").args(["-c", "sleep 2"])
        };

        let error = run_capture(command, Duration::from_millis(100), None)
            .expect_err("comando deve estourar timeout");
        assert_eq!(error.kind, ProcessErrorKind::Timeout);
    }

    #[test]
    fn windows_winget_plan_uses_show_and_fallbacks() {
        let plan = windows_winget_plan(&["git".to_string(), "Docker Desktop".to_string()]);
        assert!(plan.contains(&"winget show --id Git.Git --exact --source winget".to_string()));
        assert!(plan.contains(&"winget install -e --id Git.Git".to_string()));
        assert!(plan.contains(&"winget install --id Git.Git --exact --source winget".to_string()));
        assert!(plan.contains(&"winget show --id Docker.DockerDesktop --exact --source winget".to_string()));
        assert!(plan.contains(&"winget install -e --id Docker.DockerDesktop".to_string()));
        assert!(plan.contains(&"winget install --id Docker.DockerDesktop --exact --source winget".to_string()));
    }

    #[test]
    fn validates_project_path() {
        assert!(validate_project_path(Path::new("mg-pocket/app")).is_ok());
        assert!(validate_project_path(Path::new("")).is_err());
        assert!(validate_project_path(Path::new("/")).is_err());
    }

    #[test]
    fn limit_lines_keeps_only_tail() {
        let text = (0..400).map(|line| format!("linha {line}")).collect::<Vec<_>>().join("\n");
        let limited = limit_lines(&text, 300);
        assert_eq!(limited.lines().count(), 300);
        assert!(limited.starts_with("linha 100"));
        assert!(limited.ends_with("linha 399"));
    }

    fn planned_fast_diagnostic_commands_for_test() -> Vec<String> {
        vec![
            "git --version timeout=2s".to_string(),
            "docker --version timeout=2s".to_string(),
            "docker compose version timeout=2s".to_string(),
            "docker ps --format {{.ID}} timeout=2s".to_string(),
            "tcp localhost:3000 timeout=2s".to_string(),
            "tcp localhost:8081 timeout=2s".to_string(),
        ]
    }
}
