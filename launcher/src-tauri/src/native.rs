use std::{
    collections::{HashMap, VecDeque},
    env, fs,
    io::{BufRead, BufReader, Read, Write},
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
#[cfg(target_os = "linux")]
use std::os::unix::fs::PermissionsExt;
use tauri::AppHandle;

use crate::{
    errors::{LauncherError, LauncherResult},
    jobs::{self, JobManager},
    paths::launcher_data_dir,
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
const UI_LOG_LINES: usize = 50;

const REPO_URL: &str = "https://github.com/jvitorn/meg-pocket.git";
const COMPOSE_PROJECT: &str = "meg-pocket";
const BACKUP_SQL_FILE: &str = "postgres.sql";
const BACKUP_ENV_FILE: &str = "env.docker-local";
const BACKUP_UPLOADS_FILE: &str = "uploads.tar";
const UPLOADS_HEALTH_FILE: &str = ".meg-pocket-health";

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
    #[serde(skip_serializing_if = "Option::is_none")]
    app_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    adminer_url: Option<String>,
    app_online: bool,
    adminer_online: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    podman_installed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    container_runtime: Option<String>,
    port_3000_available: bool,
    port_80_available: bool,
    port_443_available: bool,
    port_5432_available: bool,
    database_connected: bool,
    containers_active: bool,
    nginx_online: bool,
    uploads_directory_ok: bool,
    uploads_served: bool,
    next_assets_online: bool,
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

    fn run_required_with_files(
        &mut self,
        step: &str,
        message: &str,
        progress: u8,
        command: NativeCommand,
        timeout: Duration,
        stdin_file: Option<&Path>,
        stdout_file: Option<&Path>,
    ) -> LauncherResult<CommandOutput> {
        self.progress(step, message, progress);
        let output = run_streaming_command_with_files(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            self.progress,
            command,
            timeout,
            self.job.cancel_flag(),
            stdin_file,
            stdout_file,
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
    serde_json::to_string(&dependencies).map_err(|error| {
        LauncherError::technical("Não foi possível serializar dependências", error)
    })
}

pub fn install_docker_linux(
    app: &AppHandle,
    job_manager: &JobManager,
) -> LauncherResult<CommandOutput> {
    #[cfg(target_os = "linux")]
    {
        install_system_dependencies_with_action(app, job_manager, "Instalar Docker")
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        let _ = job_manager;
        Err(LauncherError::friendly(
            "Use o fluxo de dependências do Windows para instalar Docker Desktop via winget.",
        ))
    }
}

pub fn install_system_dependencies(
    app: &AppHandle,
    job_manager: &JobManager,
) -> LauncherResult<CommandOutput> {
    install_system_dependencies_with_action(app, job_manager, "Instalar dependências")
}

fn install_system_dependencies_with_action(
    app: &AppHandle,
    job_manager: &JobManager,
    action: &str,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start(action)?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started(
        "Validando dependências",
        "Verificando dependências ausentes antes de instalar.",
        0,
    );

    let result = install_system_dependencies_steps(&mut ctx);
    match result {
        Ok(()) => Ok(ctx.finish_success("Dependências verificadas", "Dependências verificadas.")),
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

pub fn ensure_docker_running(
    app: &AppHandle,
    job_manager: &JobManager,
) -> LauncherResult<CommandOutput> {
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
    light_build: bool,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Instalar/Atualizar M&G Pocket")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Iniciando", "Iniciando instalação nativa do launcher.", 0);

    let result = install_project_steps(&mut ctx, use_sudo_docker, light_build);
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

pub fn repair_installation(
    app: &AppHandle,
    job_manager: &JobManager,
    use_sudo_docker: bool,
    light_build: bool,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Reparar instalação")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started(
        "Iniciando reparo",
        "Reconstruindo a imagem do aplicativo sem cache.",
        0,
    );

    let result = repair_installation_steps(&mut ctx, use_sudo_docker, light_build);
    match result {
        Ok(()) => Ok(ctx.finish_success("Finalizado", "Reparo concluído.")),
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
        Ok(()) => {
            Ok(ctx.finish_success("Finalizado", "M&G Pocket parado. Dados locais preservados."))
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

pub fn restart_app(
    app: &AppHandle,
    job_manager: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Reiniciar M&G Pocket")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Reiniciando", "Reiniciando containers do M&G Pocket.", 0);

    let result = restart_app_steps(&mut ctx, use_sudo_docker);
    match result {
        Ok(()) => Ok(ctx.finish_success("Finalizado", "M&G Pocket reiniciado.")),
        Err(error) if ctx.job.is_cancelled() => {
            ctx.finish_cancelled();
            Err(error)
        }
        Err(error) => {
            ctx.current_step = "Reiniciar".to_string();
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

pub fn backup(
    app: &AppHandle,
    job_manager: &JobManager,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start("Backup")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Iniciando backup", "Preparando backup local.", 0);

    let result = backup_steps(&mut ctx, use_sudo_docker);
    match result {
        Ok(path) => {
            append_limited_line(&mut ctx.stdout, &path_string(&path), CAPTURE_LIMIT_BYTES);
            Ok(ctx.finish_success("Backup concluído", "Backup concluído."))
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

pub fn restore_backup(
    app: &AppHandle,
    job_manager: &JobManager,
    backup_path: String,
    confirmed: bool,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    if !confirmed {
        return Err(LauncherError::friendly(
            "Restore exige confirmação explícita.",
        ));
    }

    let job = job_manager.start("Restaurar backup")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started(
        "Iniciando restauração",
        "Validando backup antes de alterar dados locais.",
        0,
    );

    let result = restore_backup_steps(&mut ctx, PathBuf::from(backup_path), use_sudo_docker);
    match result {
        Ok(()) => Ok(ctx.finish_success("Restauração concluída", "Backup restaurado.")),
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

pub fn reset_local_data(
    app: &AppHandle,
    job_manager: &JobManager,
    confirmed: bool,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    if !confirmed {
        return Err(LauncherError::friendly(
            "Reset local exige confirmação explícita.",
        ));
    }

    let job = job_manager.start("Resetar dados locais")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Iniciando reset", "Preparando reset dos dados locais.", 0);

    let result = reset_local_data_steps(&mut ctx, use_sudo_docker);
    match result {
        Ok(()) => Ok(ctx.finish_success("Reset concluído", "Dados locais resetados.")),
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

pub fn remove_local_project(
    app: &AppHandle,
    job_manager: &JobManager,
    mode: String,
    confirmed: bool,
    use_sudo_docker: bool,
) -> LauncherResult<CommandOutput> {
    if !confirmed {
        return Err(LauncherError::friendly(
            "Remoção local exige confirmação explícita.",
        ));
    }
    if mode != "safe" && mode != "complete" {
        return Err(LauncherError::friendly("Modo de remoção inválido."));
    }

    let job = job_manager.start("Remover projeto local")?;
    let mut ctx = NativeJob::new(app, job);
    ctx.started("Iniciando remoção", "Validando escopo da remoção local.", 0);

    let result = remove_local_project_steps(&mut ctx, &mode, use_sudo_docker);
    match result {
        Ok(()) => Ok(ctx.finish_success("Remoção concluída", "Projeto local removido.")),
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

fn install_system_dependencies_steps(ctx: &mut NativeJob<'_, '_>) -> LauncherResult<()> {
    ctx.progress(
        "Verificando dependências",
        "Mapeando dependências ausentes.",
        10,
    );
    let dependencies = build_dependency_status()?;
    if dependencies.missing.is_empty() {
        ctx.log(
            "Dependências",
            "Git, Docker e Docker Compose já estão disponíveis.",
            "info",
        );
        return Ok(());
    }

    match current_os() {
        "windows" => install_windows_system_dependencies(ctx, &dependencies),
        "linux" => install_linux_system_dependencies(ctx, &dependencies),
        _ => Err(LauncherError::friendly(
            "A instalação automática de dependências é suportada apenas no Linux e Windows.",
        )),
    }
}

fn ensure_docker_running_steps(ctx: &mut NativeJob<'_, '_>) -> LauncherResult<()> {
    ensure_docker_daemon(ctx, false, 60)?;
    resolve_compose_command(false, QUICK_TIMEOUT, None)?;
    Ok(())
}

fn ensure_docker_daemon(
    ctx: &mut NativeJob<'_, '_>,
    use_sudo_docker: bool,
    progress: u8,
) -> LauncherResult<()> {
    ctx.progress(
        "Verificar Docker",
        "Executando docker info para validar o daemon.",
        progress,
    );
    if docker_info_success(use_sudo_docker, Some(ctx.job.cancel_flag())) {
        return Ok(());
    }

    ctx.log(
        "Iniciando Docker",
        "Docker foi encontrado, mas o daemon ainda não respondeu. Tentando iniciar automaticamente.",
        "info",
    );
    start_docker_daemon(ctx, use_sudo_docker, progress.saturating_add(5).min(85));

    ctx.progress(
        "Aguardando Docker",
        "Aguardando Docker Engine ficar disponível.",
        progress.saturating_add(10).min(90),
    );
    retry_step(ctx, Duration::from_secs(180), Duration::from_secs(2), || {
        docker_info_success(use_sudo_docker, Some(ctx.job.cancel_flag()))
    })
    .map_err(|_| {
        LauncherError::friendly(
            "Docker foi encontrado, mas o daemon não ficou pronto a tempo. Abra o Docker Desktop ou inicie o serviço Docker e tente novamente.",
        )
    })
}

fn docker_info_success(use_sudo_docker: bool, cancel: Option<Arc<AtomicBool>>) -> bool {
    run_capture(
        docker_command(vec!["info"], use_sudo_docker),
        SHORT_TIMEOUT,
        cancel,
    )
    .map(|output| output.success)
    .unwrap_or(false)
}

fn start_docker_daemon(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool, progress: u8) {
    #[cfg(target_os = "linux")]
    {
        if command_success("systemctl", ["--version"], QUICK_TIMEOUT) {
            let command = if use_sudo_docker {
                NativeCommand::new("sudo").args(["-n", "systemctl", "start", "docker"])
            } else {
                NativeCommand::new("sudo").args(["-n", "systemctl", "start", "docker"])
            };
            ctx.run_optional(
                "Iniciando Docker",
                "Tentando iniciar o serviço docker via systemctl.",
                progress,
                command,
                MEDIUM_TIMEOUT,
            );

            if !docker_info_success(use_sudo_docker, Some(ctx.job.cancel_flag()))
                && command_success("pkexec", ["--version"], QUICK_TIMEOUT)
            {
                ctx.run_optional(
                    "Iniciando Docker",
                    "Abrindo autorização do sistema para iniciar Docker.",
                    progress.saturating_add(2).min(90),
                    NativeCommand::new("pkexec").args(["systemctl", "start", "docker"]),
                    MEDIUM_TIMEOUT,
                );
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(path) = docker_desktop_path() {
            ctx.run_optional(
                "Iniciando Docker Desktop",
                "Abrindo Docker Desktop.",
                progress,
                NativeCommand::new("powershell.exe").args(vec![
                    "-NoProfile".to_string(),
                    "-Command".to_string(),
                    format!("Start-Process -FilePath '{}'", powershell_escape(&path)),
                ]),
                SHORT_TIMEOUT,
            );
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = ctx;
        let _ = use_sudo_docker;
        let _ = progress;
    }
}

fn ensure_docker_permission_steps(ctx: &mut NativeJob<'_, '_>) -> LauncherResult<()> {
    let direct = run_capture(
        docker_command(vec!["info"], false),
        SHORT_TIMEOUT,
        Some(ctx.job.cancel_flag()),
    );
    if direct
        .as_ref()
        .map(|output| output.success)
        .unwrap_or(false)
    {
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

fn install_project_steps(
    ctx: &mut NativeJob<'_, '_>,
    use_sudo_docker: bool,
    light_build: bool,
) -> LauncherResult<()> {
    ctx.progress("Verificando Git", "Verificando Git.", 10);
    require_command(
        "git",
        ["--version"],
        "Git não foi encontrado. Instale o Git antes de continuar.",
    )?;

    ctx.progress("Verificando Docker", "Verificando Docker Engine.", 20);
    ensure_docker_daemon(ctx, use_sudo_docker, 20)?;

    ctx.progress(
        "Verificando Docker Compose",
        "Verificando Docker Compose.",
        30,
    );
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;

    ctx.progress("Verificando permissões", "Validando permissão Docker.", 40);
    ensure_docker_permission_for_install(use_sudo_docker)?;

    let project_dir = project_dir();
    ctx.progress("Preparando pasta local", "Preparando pasta do projeto.", 50);
    validate_project_path(&project_dir)?;
    prepare_project_source(ctx, &project_dir)?;

    ctx.progress(
        "Preparando .env",
        "Preparando .env.docker-local e storage local.",
        70,
    );
    prepare_project_files(&project_dir)?;
    cleanup_legacy_app_compose_project(ctx, &compose, &project_dir);

    ctx.run_required(
        "Construindo imagem",
        if light_build {
            "Construindo app com React Compiler desativado."
        } else {
            "Construindo app standalone."
        },
        80,
        compose_build_app_command(&compose, &project_dir, light_build, false),
        LONG_TIMEOUT,
    )?;

    ctx.run_required(
        "Subindo banco",
        "Subindo Postgres para setup local.",
        84,
        compose.command(
            &project_dir,
            ["--env-file", ".env.docker-local", "up", "-d", "postgres"],
        ),
        LONG_TIMEOUT,
    )?;

    wait_for_postgres(ctx, &compose, &project_dir)?;

    ctx.run_required(
        "Rodando setup",
        "Aplicando migrations e preparando Prisma.",
        90,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "run",
                "--rm",
                "--build",
                "maintenance",
                "npm",
                "run",
                "db:setup",
            ],
        ),
        LONG_TIMEOUT,
    )?;

    run_seed_if_needed(ctx, &compose, &project_dir)?;
    ctx.run_required(
        "Subindo containers",
        "Subindo aplicação standalone e Nginx.",
        95,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "up",
                "-d",
                "app",
                "nginx",
            ],
        ),
        LONG_TIMEOUT,
    )?;
    ctx.run_optional(
        "Subindo Adminer",
        "Tentando iniciar Adminer.",
        96,
        compose.command(
            &project_dir,
            ["--env-file", ".env.docker-local", "up", "-d", "adminer"],
        ),
        MEDIUM_TIMEOUT,
    );
    wait_for_app_alive(ctx, &compose, &project_dir)?;
    warn_if_database_unavailable(ctx, &compose, &project_dir);
    validate_site(ctx)?;
    Ok(())
}

fn repair_installation_steps(
    ctx: &mut NativeJob<'_, '_>,
    use_sudo_docker: bool,
    light_build: bool,
) -> LauncherResult<()> {
    let project_dir = project_dir();
    require_project(&project_dir)?;
    validate_project_path(&project_dir)?;
    prepare_project_files(&project_dir)?;

    ctx.progress("Verificando Docker", "Validando Docker Engine.", 15);
    ensure_docker_daemon(ctx, use_sudo_docker, 15)?;
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
    cleanup_legacy_app_compose_project(ctx, &compose, &project_dir);

    ctx.run_required(
        "Reconstruindo imagem",
        if light_build {
            "Reconstruindo app sem cache e com React Compiler desativado."
        } else {
            "Reconstruindo app sem cache."
        },
        55,
        compose_build_app_command(&compose, &project_dir, light_build, true),
        LONG_TIMEOUT,
    )?;

    ctx.run_required(
        "Subindo containers",
        "Subindo Postgres, aplicação standalone e Nginx.",
        80,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "up",
                "-d",
                "postgres",
                "app",
                "nginx",
            ],
        ),
        LONG_TIMEOUT,
    )?;
    ctx.run_optional(
        "Subindo Adminer",
        "Tentando iniciar Adminer.",
        86,
        compose.command(
            &project_dir,
            ["--env-file", ".env.docker-local", "up", "-d", "adminer"],
        ),
        MEDIUM_TIMEOUT,
    );
    wait_for_app_alive(ctx, &compose, &project_dir)?;
    warn_if_database_unavailable(ctx, &compose, &project_dir);
    validate_site(ctx)?;
    Ok(())
}

fn start_app_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<()> {
    let project_dir = project_dir();
    require_project(&project_dir)?;
    validate_project_path(&project_dir)?;
    prepare_project_files(&project_dir)?;

    ctx.progress("Verificando Docker", "Validando Docker Engine.", 15);
    ensure_docker_daemon(ctx, use_sudo_docker, 15)?;
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
    cleanup_legacy_app_compose_project(ctx, &compose, &project_dir);

    ctx.run_required(
        "Subindo banco",
        "Subindo Postgres.",
        65,
        compose.command(
            &project_dir,
            ["--env-file", ".env.docker-local", "up", "-d", "postgres"],
        ),
        LONG_TIMEOUT,
    )?;
    wait_for_postgres(ctx, &compose, &project_dir)?;
    ctx.run_required(
        "Subindo containers",
        "Subindo aplicação standalone e Nginx.",
        70,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "up",
                "-d",
                "app",
                "nginx",
            ],
        ),
        LONG_TIMEOUT,
    )?;
    ctx.run_optional(
        "Subindo Adminer",
        "Tentando iniciar Adminer.",
        75,
        compose.command(
            &project_dir,
            ["--env-file", ".env.docker-local", "up", "-d", "adminer"],
        ),
        MEDIUM_TIMEOUT,
    );
    wait_for_app_alive(ctx, &compose, &project_dir)?;
    warn_if_database_unavailable(ctx, &compose, &project_dir);
    validate_site(ctx)?;
    Ok(())
}

fn stop_app_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<()> {
    let project_dir = project_dir();
    require_project(&project_dir)?;
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
    stop_compose_project(ctx, &compose, &project_dir, &compose_project_name(), true)?;
    if compose_project_name() != "meg-pocket" {
        stop_compose_project(ctx, &compose, &project_dir, "meg-pocket", false)?;
    }
    if compose_project_name() != "app" {
        stop_compose_project(ctx, &compose, &project_dir, "app", false)?;
    }
    Ok(())
}

fn restart_app_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<()> {
    let project_dir = project_dir();
    ctx.progress("Verificando projeto local", "Validando projeto local.", 20);
    require_project(&project_dir)?;
    validate_project_path(&project_dir)?;
    prepare_project_files(&project_dir)?;
    ensure_docker_daemon(ctx, use_sudo_docker, 28)?;
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;

    ctx.run_required(
        "Parando containers",
        "Parando containers antes do reinício.",
        35,
        compose_down_command(&compose, &project_dir, false),
        LONG_TIMEOUT,
    )?;

    ctx.run_required(
        "Subindo containers",
        "Subindo aplicação standalone e Nginx.",
        60,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "up",
                "-d",
                "postgres",
                "app",
                "nginx",
            ],
        ),
        LONG_TIMEOUT,
    )?;
    ctx.run_optional(
        "Subindo Adminer",
        "Tentando iniciar Adminer.",
        75,
        compose.command(
            &project_dir,
            ["--env-file", ".env.docker-local", "up", "-d", "adminer"],
        ),
        MEDIUM_TIMEOUT,
    );
    ctx.progress("Aguardando serviços", "Aguardando serviços locais.", 85);
    wait_for_app_alive(ctx, &compose, &project_dir)?;
    warn_if_database_unavailable(ctx, &compose, &project_dir);
    validate_site(ctx)?;
    Ok(())
}

fn read_logs_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<String> {
    let project_dir = project_dir();
    require_project(&project_dir)?;
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
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

fn backup_steps(ctx: &mut NativeJob<'_, '_>, use_sudo_docker: bool) -> LauncherResult<PathBuf> {
    let project_dir = project_dir();
    ctx.progress(
        "Verificando projeto local",
        "Validando pasta local do projeto.",
        15,
    );
    require_project(&project_dir)?;
    validate_project_path(&project_dir)?;
    prepare_project_files(&project_dir)?;

    ctx.progress(
        "Verificando containers",
        "Validando Docker e Docker Compose.",
        30,
    );
    ensure_docker_daemon(ctx, use_sudo_docker, 30)?;
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
    ensure_postgres_for_maintenance(ctx, &compose, &project_dir, 40)?;

    create_backup_archive(ctx, &compose, &project_dir, 45, 65, 85)
}

fn restore_backup_steps(
    ctx: &mut NativeJob<'_, '_>,
    backup_file: PathBuf,
    use_sudo_docker: bool,
) -> LauncherResult<()> {
    ctx.progress("Validando backup", "Validando arquivo de backup.", 10);
    validate_backup_file(&backup_file)?;

    let mut temp_dir = TempDirGuard::new("mg-pocket-restore")?;
    ctx.progress(
        "Extraindo backup",
        "Extraindo backup em pasta temporária.",
        25,
    );
    extract_backup_archive(ctx, &backup_file, temp_dir.path())?;
    let dump_file = temp_dir.path().join(BACKUP_SQL_FILE);
    if !dump_file.is_file() {
        return Err(LauncherError::friendly(
            "Backup inválido: postgres.sql não foi encontrado.",
        ));
    }

    let project_dir = project_dir();
    ctx.progress(
        "Validando projeto local",
        "Validando pasta local do projeto.",
        35,
    );
    require_project(&project_dir)?;
    validate_project_path(&project_dir)?;

    ctx.progress(
        "Parando containers",
        "Parando app, Adminer e Nginx antes do restore.",
        40,
    );
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;
    restore_env_file(temp_dir.path(), &project_dir)?;
    ctx.run_optional(
        "Parando containers",
        "Parando serviços que usam o banco.",
        45,
        compose.command(
            &project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "stop",
                "app",
                "adminer",
                "nginx",
            ],
        ),
        MEDIUM_TIMEOUT,
    );

    ensure_postgres_for_maintenance(ctx, &compose, &project_dir, 55)?;
    ctx.run_required(
        "Restaurando dados",
        "Limpando schema público antes de restaurar o dump.",
        70,
        compose.command(
            &project_dir,
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
                "-c",
                "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
            ],
        ),
        MEDIUM_TIMEOUT,
    )?;
    ctx.run_required_with_files(
        "Restaurando dados",
        "Restaurando dump do banco a partir do backup.",
        75,
        compose.command(
            &project_dir,
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
            ],
        ),
        LONG_TIMEOUT,
        Some(&dump_file),
        None,
    )?;

    ctx.progress(
        "Aplicando arquivos",
        "Aplicando arquivos locais do backup.",
        82,
    );
    restore_storage_with_rollback(ctx, &compose, temp_dir.path(), &project_dir)?;

    ctx.progress(
        "Subindo containers",
        "Subindo containers depois da restauração.",
        90,
    );
    start_app_steps(ctx, use_sudo_docker)?;
    temp_dir.cleanup();
    Ok(())
}

fn reset_local_data_steps(
    ctx: &mut NativeJob<'_, '_>,
    use_sudo_docker: bool,
) -> LauncherResult<()> {
    let project_dir = project_dir();
    ctx.progress("Validando segurança", "Validando escopo do reset.", 20);
    require_project(&project_dir)?;
    validate_project_path(&project_dir)?;
    prepare_project_files(&project_dir)?;
    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()))?;

    ctx.log(
        "Backup automático",
        "Tentando criar backup antes do reset.",
        "info",
    );
    match ensure_postgres_for_maintenance(ctx, &compose, &project_dir, 25)
        .and_then(|_| create_backup_archive(ctx, &compose, &project_dir, 28, 32, 36))
    {
        Ok(path) => ctx.log(
            "Backup automático",
            &format!("Backup criado antes do reset: {}", path.display()),
            "info",
        ),
        Err(error) => ctx.log(
            "Backup automático",
            &format!(
                "Backup automático falhou. Continuando porque o reset foi confirmado: {}",
                error.friendly_message()
            ),
            "error",
        ),
    }

    ctx.run_required(
        "Parando containers",
        "Parando containers e removendo volumes do projeto.",
        60,
        compose.command(
            &project_dir,
            ["--env-file", ".env.docker-local", "down", "-v"],
        ),
        LONG_TIMEOUT,
    )?;

    ctx.progress(
        "Limpando estado local",
        "Limpando storage e marcador de seed.",
        80,
    );
    remove_dir_retry(&project_dir.join("storage").join("local").join("public"))?;
    fs::create_dir_all(project_dir.join("storage").join("local").join("public")).map_err(
        |error| LauncherError::technical("Não foi possível recriar storage local", error),
    )?;
    remove_dir_retry(&project_dir.join("public").join("uploads"))?;
    fs::create_dir_all(project_dir.join("public").join("uploads")).map_err(|error| {
        LauncherError::technical("Não foi possível recriar uploads públicos locais", error)
    })?;
    remove_file_if_exists(
        &project_dir
            .join("installers")
            .join(".seed-inicial-concluido"),
    )?;

    install_project_steps(ctx, use_sudo_docker, false)?;
    Ok(())
}

fn remove_local_project_steps(
    ctx: &mut NativeJob<'_, '_>,
    mode: &str,
    use_sudo_docker: bool,
) -> LauncherResult<()> {
    let project_dir = project_dir();
    if !project_dir.exists() {
        ctx.log(
            "Validando projeto local",
            &format!("Projeto local não encontrado em {}.", project_dir.display()),
            "info",
        );
        return Ok(());
    }

    ctx.progress(
        "Validando projeto local",
        "Validando caminho local antes de apagar.",
        20,
    );
    let safe_project_dir = validate_project_delete_path(&project_dir)?;

    let compose =
        resolve_compose_command(use_sudo_docker, QUICK_TIMEOUT, Some(ctx.job.cancel_flag()));
    match (mode, compose) {
        ("complete", Ok(compose)) => {
            ctx.run_required(
                "Parando containers",
                "Remoção completa: removendo containers, volumes e redes do projeto.",
                55,
                compose_down_command(&compose, &safe_project_dir, true),
                LONG_TIMEOUT,
            )?;
        }
        ("complete", Err(error)) => return Err(error),
        (_, Ok(compose)) => {
            ctx.run_optional(
                "Parando containers",
                "Remoção segura: parando containers e preservando volumes Docker.",
                55,
                compose_down_command(&compose, &safe_project_dir, false),
                MEDIUM_TIMEOUT,
            );
        }
        (_, Err(error)) => {
            ctx.log(
                "Parando containers",
                &format!(
                    "Não foi possível validar Docker Compose. Removendo apenas a pasta local: {}",
                    error.friendly_message()
                ),
                "error",
            );
        }
    }

    ctx.progress(
        "Removendo pasta local",
        "Removendo pasta local do projeto.",
        85,
    );
    remove_dir_retry(&safe_project_dir)?;
    Ok(())
}

fn ensure_postgres_for_maintenance(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
    progress: u8,
) -> LauncherResult<()> {
    ctx.run_required(
        "Verificando containers",
        "Subindo Postgres para operação local.",
        progress,
        compose.command(
            project_dir,
            ["--env-file", ".env.docker-local", "up", "-d", "postgres"],
        ),
        LONG_TIMEOUT,
    )?;
    wait_for_postgres(ctx, compose, project_dir)
}

fn create_backup_archive(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
    export_progress: u8,
    files_progress: u8,
    archive_progress: u8,
) -> LauncherResult<PathBuf> {
    let mut temp_dir = TempDirGuard::new("mg-pocket-backup")?;
    let dump_file = temp_dir.path().join(BACKUP_SQL_FILE);

    ctx.run_required_with_files(
        "Exportando dados",
        "Exportando banco de dados local.",
        export_progress,
        compose.command(
            project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "exec",
                "-T",
                "postgres",
                "pg_dump",
                "-U",
                "meg",
                "-d",
                "meg_pocket",
            ],
        ),
        LONG_TIMEOUT,
        None,
        Some(&dump_file),
    )?;

    ctx.progress(
        "Preparando arquivos",
        "Copiando arquivos locais para pasta temporária.",
        files_progress,
    );
    let env_file = project_dir.join(".env.docker-local");
    if env_file.is_file() {
        copy_file_retry(&env_file, &temp_dir.path().join(BACKUP_ENV_FILE))?;
    }

    let uploads_archive = temp_dir.path().join(BACKUP_UPLOADS_FILE);
    let output = run_streaming_command_with_files(
        ctx.app,
        ctx.job.job_id(),
        ctx.job.action(),
        "Preparando arquivos",
        files_progress,
        compose.command(
            project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "run",
                "--rm",
                "--no-deps",
                "maintenance",
                "tar",
                "-C",
                "/app/uploads",
                "-cf",
                "-",
                ".",
            ],
        ),
        LONG_TIMEOUT,
        ctx.job.cancel_flag(),
        None,
        Some(&uploads_archive),
    )
    .map_err(|error| process_error_to_launcher("Preparando arquivos", error))?;
    ctx.append_output(&output);
    if !output.success {
        ctx.log(
            "Preparando arquivos",
            "Não foi possível exportar uploads pelo volume Docker. Tentando fallback legado.",
            "error",
        );
        let _ = remove_file_if_exists(&uploads_archive);
    }

    let storage_public = project_dir.join("storage").join("local").join("public");
    if storage_public.is_dir() {
        let storage_target = temp_dir.path().join("storage").join("local").join("public");
        copy_dir_retry(&storage_public, &storage_target)?;
    }

    let destination_dir = backup_dir()?;
    fs::create_dir_all(&destination_dir).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta de backups", error)
    })?;
    let backup_file = destination_dir.join(default_backup_file_name());
    archive_temp_dir(ctx, temp_dir.path(), &backup_file, archive_progress)?;
    temp_dir.cleanup();
    ctx.log(
        "Backup concluído",
        &format!("Backup salvo em {}", backup_file.display()),
        "info",
    );
    Ok(backup_file)
}

fn archive_temp_dir(
    ctx: &mut NativeJob<'_, '_>,
    temp_dir: &Path,
    backup_file: &Path,
    progress: u8,
) -> LauncherResult<()> {
    #[cfg(target_os = "windows")]
    {
        ctx.run_required(
            "Salvando backup",
            "Compactando backup em arquivo .zip.",
            progress,
            NativeCommand::new("powershell.exe").args(vec![
                "-NoProfile".to_string(),
                "-Command".to_string(),
                format!(
                    "Compress-Archive -Path '{}' -DestinationPath '{}' -Force",
                    powershell_escape(&temp_dir.join("*")),
                    powershell_escape(backup_file)
                ),
            ]),
            LONG_TIMEOUT,
        )?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        ctx.run_required(
            "Salvando backup",
            "Compactando backup em arquivo .tar.gz.",
            progress,
            NativeCommand::new("tar").args(vec![
                "-czf".to_string(),
                path_string(backup_file),
                "-C".to_string(),
                path_string(temp_dir),
                ".".to_string(),
            ]),
            LONG_TIMEOUT,
        )?;
    }

    Ok(())
}

fn extract_backup_archive(
    ctx: &mut NativeJob<'_, '_>,
    backup_file: &Path,
    temp_dir: &Path,
) -> LauncherResult<()> {
    #[cfg(target_os = "windows")]
    {
        ctx.run_required(
            "Extraindo backup",
            "Extraindo arquivo .zip.",
            25,
            NativeCommand::new("powershell.exe").args(vec![
                "-NoProfile".to_string(),
                "-Command".to_string(),
                format!(
                    "Expand-Archive -Path '{}' -DestinationPath '{}' -Force",
                    powershell_escape(backup_file),
                    powershell_escape(temp_dir)
                ),
            ]),
            LONG_TIMEOUT,
        )?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        ctx.run_required(
            "Extraindo backup",
            "Extraindo arquivo .tar.gz.",
            25,
            NativeCommand::new("tar").args(vec![
                "-xzf".to_string(),
                path_string(backup_file),
                "-C".to_string(),
                path_string(temp_dir),
            ]),
            LONG_TIMEOUT,
        )?;
    }

    Ok(())
}

fn restore_env_file(temp_dir: &Path, project_dir: &Path) -> LauncherResult<()> {
    let backup_env = temp_dir.join(BACKUP_ENV_FILE);
    if backup_env.is_file() {
        copy_file_retry(&backup_env, &project_dir.join(".env.docker-local"))?;
    } else {
        prepare_project_files(project_dir)?;
    }
    Ok(())
}

fn restore_storage_with_rollback(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    temp_dir: &Path,
    project_dir: &Path,
) -> LauncherResult<()> {
    let uploads_archive = temp_dir.join(BACKUP_UPLOADS_FILE);
    if uploads_archive.is_file() {
        ctx.run_required_with_files(
            "Aplicando arquivos",
            "Restaurando volume persistente de uploads.",
            84,
            compose.command(
                project_dir,
                [
                    "--env-file",
                    ".env.docker-local",
                    "run",
                    "--rm",
                    "--no-deps",
                    "maintenance",
                    "sh",
                    "-lc",
                    "rm -rf /app/uploads/* /app/uploads/.[!.]* /app/uploads/..?* 2>/dev/null || true; mkdir -p /app/uploads; tar -C /app/uploads -xf -",
                ],
            ),
            LONG_TIMEOUT,
            Some(&uploads_archive),
            None,
        )?;
        return Ok(());
    }

    let backup_storage = temp_dir.join("storage").join("local").join("public");
    if !backup_storage.is_dir() {
        return Ok(());
    }

    let current_storage = project_dir.join("storage").join("local").join("public");
    let rollback_storage = temp_dir.join("storage-rollback-public");
    if current_storage.exists() {
        rename_retry(&current_storage, &rollback_storage)?;
    }

    let result = copy_dir_retry(&backup_storage, &current_storage);
    if let Err(error) = result {
        let _ = remove_dir_retry(&current_storage);
        if rollback_storage.exists() {
            let _ = rename_retry(&rollback_storage, &current_storage);
        }
        return Err(error);
    }

    let _ = remove_dir_retry(&rollback_storage);
    Ok(())
}

fn compose_down_command(
    compose: &ComposeCommand,
    project_dir: &Path,
    remove_volumes: bool,
) -> NativeCommand {
    let mut args = Vec::new();
    if project_dir.join(".env.docker-local").is_file() {
        args.extend(["--env-file".to_string(), ".env.docker-local".to_string()]);
    }
    args.push("down".to_string());
    if remove_volumes {
        args.push("-v".to_string());
    }
    args.push("--remove-orphans".to_string());
    compose.command(project_dir, args)
}

fn compose_build_app_command(
    compose: &ComposeCommand,
    project_dir: &Path,
    light_build: bool,
    no_cache: bool,
) -> NativeCommand {
    let mut args = vec![
        "--env-file".to_string(),
        ".env.docker-local".to_string(),
        "build".to_string(),
    ];
    if no_cache {
        args.push("--no-cache".to_string());
    }
    args.push("app".to_string());

    let command = compose.command(project_dir, args);
    if light_build {
        command.env("NEXT_REACT_COMPILER", "false")
    } else {
        command
    }
}

#[cfg(target_os = "linux")]
fn install_linux_system_dependencies(
    ctx: &mut NativeJob<'_, '_>,
    dependencies: &DependencyStatus,
) -> LauncherResult<()> {
    if !command_success("sudo", ["-V"], QUICK_TIMEOUT) {
        return Err(LauncherError::friendly(
            "sudo não foi encontrado. Instale Git, Docker e Docker Compose manualmente e volte ao launcher.",
        ));
    }

    let distro = linux_distro().ok_or_else(|| {
        LauncherError::friendly(
            "Não consegui detectar a distribuição Linux para instalar dependências automaticamente.",
        )
    })?;
    let commands = linux_dependency_admin_commands(&distro.family).ok_or_else(|| {
        LauncherError::friendly(
            "Esta distribuição ainda não é suportada pelo instalador automático. Instale Git, Docker e Docker Compose manualmente.",
        )
    })?;

    ctx.progress(
        "Permissão administrativa",
        "Abrindo terminal do sistema para instalar dependências.",
        25,
    );
    ctx.log(
        "Dependências",
        &format!("Dependências ausentes: {}", dependencies.missing.join(", ")),
        "info",
    );

    let log_path = run_linux_admin_commands(
        ctx,
        "Instalação de dependências Linux",
        &[
            "instalar Git, Docker e Docker Compose, se necessário",
            "iniciar o serviço docker",
            "ajustar o grupo docker para seu usuário, quando necessário",
        ],
        &commands,
    )?;
    append_admin_log(ctx, &log_path);
    Ok(())
}

#[cfg(not(target_os = "linux"))]
fn install_linux_system_dependencies(
    _ctx: &mut NativeJob<'_, '_>,
    _dependencies: &DependencyStatus,
) -> LauncherResult<()> {
    Err(LauncherError::friendly(
        "A instalação automática de dependências Linux só roda no Linux.",
    ))
}

#[cfg(target_os = "linux")]
fn linux_dependency_admin_commands(family: &str) -> Option<Vec<String>> {
    let install = match family {
        "arch_like" => "sudo pacman -S --needed --noconfirm git curl docker docker-compose bash coreutils",
        "ubuntu_like" | "debian_like" => {
            "sudo apt update\nsudo apt install -y git curl docker.io docker-compose-plugin bash coreutils"
        }
        "fedora_like" => "sudo dnf install -y git curl docker docker-compose-plugin bash coreutils",
        _ => return None,
    };

    Some(vec![
        "sudo -v".to_string(),
        install.to_string(),
        "if command -v systemctl >/dev/null 2>&1 && command -v docker >/dev/null 2>&1; then sudo systemctl enable --now docker || true; fi".to_string(),
        "if command -v docker >/dev/null 2>&1 && [ -n \"${USER:-}\" ]; then sudo groupadd -f docker || true; sudo usermod -aG docker \"$USER\" || true; fi".to_string(),
        "docker --version || sudo docker --version".to_string(),
        "docker compose version || docker-compose --version || sudo docker compose version || sudo docker-compose --version".to_string(),
    ])
}

#[cfg(target_os = "linux")]
fn run_linux_admin_commands(
    ctx: &mut NativeJob<'_, '_>,
    title: &str,
    summary: &[&str],
    commands: &[String],
) -> LauncherResult<PathBuf> {
    let (log_path, wrapper_path) = admin_temp_paths("linux-dependencies", "sh")?;
    let summary = summary.join("\\n- ");
    let command_text = commands.join("\n");

    let wrapper = format!(
        r#"#!/usr/bin/env bash
set -uo pipefail
LOG_FILE={log_file}
echo "M&G Pocket Launcher" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Etapa: {title}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Esta etapa precisa de permissão administrativa." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Comandos que serão executados:" | tee -a "$LOG_FILE"
printf -- "- {summary}\n" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Se o sistema pedir senha, use a senha do seu usuário." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
(
set -euo pipefail
{commands}
) 2>&1 | tee -a "$LOG_FILE"
code=${{PIPESTATUS[0]}}
echo "" | tee -a "$LOG_FILE"
if [ "$code" -eq 0 ]; then
  echo "Sucesso: dependências verificadas." | tee -a "$LOG_FILE"
else
  echo "Falha: veja o log técnico em $LOG_FILE" | tee -a "$LOG_FILE"
fi
echo ""
read -r -p "Pressione Enter para fechar este terminal."
exit "$code"
"#,
        log_file = shell_quote(log_path.to_string_lossy().as_ref()),
        title = title,
        summary = summary,
        commands = command_text,
    );

    fs::write(&wrapper_path, wrapper).map_err(|error| {
        LauncherError::technical("Não foi possível preparar terminal administrativo", error)
    })?;
    let mut permissions = fs::metadata(&wrapper_path)
        .map_err(|error| {
            LauncherError::technical("Não foi possível ler terminal administrativo", error)
        })?
        .permissions();
    permissions.set_mode(0o700);
    fs::set_permissions(&wrapper_path, permissions).map_err(|error| {
        LauncherError::technical("Não foi possível proteger terminal administrativo", error)
    })?;

    ctx.progress(
        "Terminal administrativo",
        "Aguardando conclusão no terminal externo.",
        40,
    );
    let status = run_terminal_and_wait(&wrapper_path)?;
    let _ = fs::remove_file(&wrapper_path);
    if status.success() {
        ctx.progress(
            "Dependências instaladas",
            "Dependências verificadas pelo sistema.",
            90,
        );
        Ok(log_path)
    } else {
        append_admin_log(ctx, &log_path);
        Err(LauncherError::friendly(
            "A instalação de dependências falhou ou foi cancelada no terminal administrativo.",
        ))
    }
}

#[cfg(target_os = "linux")]
fn run_terminal_and_wait(wrapper_path: &Path) -> LauncherResult<std::process::ExitStatus> {
    let wrapper = wrapper_path.to_string_lossy().to_string();
    let candidates: Vec<(&str, Vec<String>)> = vec![
        (
            "gnome-terminal",
            vec!["--wait".into(), "--".into(), "bash".into(), wrapper.clone()],
        ),
        (
            "konsole",
            vec![
                "--nofork".into(),
                "-e".into(),
                "bash".into(),
                wrapper.clone(),
            ],
        ),
        (
            "x-terminal-emulator",
            vec!["-e".into(), "bash".into(), wrapper.clone()],
        ),
        ("xterm", vec!["-e".into(), "bash".into(), wrapper]),
    ];

    let mut last_error = None;
    for (program, args) in candidates {
        let mut command = Command::new(program);
        command.args(args);
        scripts::sanitize_child_environment(&mut command);
        match command.status() {
            Ok(status) => return Ok(status),
            Err(error) => last_error = Some(error),
        }
    }

    Err(LauncherError::new(
        "Não encontrei um terminal gráfico para pedir permissão administrativa.",
        format!(
            "Falha ao abrir terminal externo: {}",
            last_error
                .map(|error| error.to_string())
                .unwrap_or_else(|| "nenhum terminal encontrado".to_string())
        ),
    ))
}

#[cfg(target_os = "windows")]
fn install_windows_system_dependencies(
    ctx: &mut NativeJob<'_, '_>,
    dependencies: &DependencyStatus,
) -> LauncherResult<()> {
    if !command_success("winget", ["--version"], QUICK_TIMEOUT) {
        return Err(LauncherError::friendly(
            "winget não foi encontrado. Instale ou atualize o App Installer pela Microsoft Store e tente novamente.",
        ));
    }

    let packages = windows_dependency_packages(&dependencies.missing);
    if packages.is_empty() {
        ctx.log(
            "Dependências",
            "Nenhuma dependência instalável pelo winget está ausente.",
            "info",
        );
        return Ok(());
    }

    ctx.progress(
        "Permissão administrativa",
        "Abrindo PowerShell elevado para instalar dependências.",
        25,
    );
    let (script_path, log_path) = write_windows_dependency_script(&packages)?;
    let elevated_command = format!(
        "try {{ $p = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File','{}') -Verb RunAs -Wait -PassThru; if ($null -eq $p) {{ exit 1 }}; exit $p.ExitCode }} catch {{ Write-Error $_; exit 1 }}",
        powershell_escape(&script_path)
    );

    let result = ctx.run_required(
        "Instalando dependências",
        "Aguardando instalador elevado do Windows.",
        40,
        NativeCommand::new("powershell.exe").args(vec![
            "-NoProfile".to_string(),
            "-Command".to_string(),
            elevated_command,
        ]),
        LONG_TIMEOUT,
    );
    let _ = fs::remove_file(&script_path);
    append_admin_log(ctx, &log_path);
    result?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn install_windows_system_dependencies(
    _ctx: &mut NativeJob<'_, '_>,
    _dependencies: &DependencyStatus,
) -> LauncherResult<()> {
    Err(LauncherError::friendly(
        "A instalação automática de dependências Windows só roda no Windows.",
    ))
}

#[cfg(target_os = "windows")]
fn windows_dependency_packages(missing: &[String]) -> Vec<(&'static str, &'static str)> {
    let mut packages = Vec::new();
    if missing.iter().any(|item| item.eq_ignore_ascii_case("git")) {
        packages.push(("Git for Windows", "Git.Git"));
    }
    if missing.iter().any(|item| {
        item.eq_ignore_ascii_case("docker desktop") || item.eq_ignore_ascii_case("docker")
    }) {
        packages.push(("Docker Desktop", "Docker.DockerDesktop"));
    }
    packages
}

#[cfg(target_os = "windows")]
fn write_windows_dependency_script(
    packages: &[(&str, &str)],
) -> LauncherResult<(PathBuf, PathBuf)> {
    let (log_path, script_path) = admin_temp_paths("windows-dependencies", "ps1")?;
    let friendly_list = packages
        .iter()
        .map(|(name, _)| format!("- {name}"))
        .collect::<Vec<_>>()
        .join("`r`n");
    let install_blocks = packages
        .iter()
        .map(|(name, id)| {
            format!(
                r#"
Write-Host "Verificando pacote: {name}"
winget show --id {id} --exact --source winget
if ($LASTEXITCODE -ne 0) {{
  Write-Host "Pacote {name} não foi encontrado no winget. Pulando."
  $failed = $true
}} else {{
  Write-Host "Executando: winget install -e --id {id}"
  winget install -e --id {id}
  if ($LASTEXITCODE -ne 0) {{
    Write-Host "Primeira tentativa falhou. Tentando fallback com --exact --source winget..."
    winget install --id {id} --exact --source winget
  }}
  if ($LASTEXITCODE -ne 0) {{
    Write-Host "Falha ao instalar {name} pelo winget."
    $failed = $true
  }}
}}
"#
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    let script = format!(
        r#"$ErrorActionPreference = "Continue"
$failed = $false
Start-Transcript -Path '{log_path}' -Append
Write-Host "M&G Pocket Launcher"
Write-Host ""
Write-Host "Etapa: Instalação de dependências do Windows"
Write-Host ""
Write-Host "Dependências que serão instaladas:"
Write-Host @'
{friendly_list}
'@
Write-Host ""
Write-Host "Antes de instalar qualquer dependência, o launcher mostrará o que será feito e pedirá sua confirmação."
Write-Host "Se o Windows pedir permissão, confirme pela janela do sistema."
Write-Host ""
{install_blocks}
Write-Host ""
if ($failed) {{
  Write-Host "Falha ao instalar uma ou mais dependências. Veja o log técnico em: {log_path}"
  Stop-Transcript
  Read-Host "Pressione Enter para fechar"
  exit 1
}}
Write-Host "Dependências instaladas ou já disponíveis."
Write-Host "Se o Docker Desktop foi instalado agora, abra o Docker Desktop e aguarde o Docker Engine iniciar."
Write-Host "Se o Windows solicitar reinicialização, reinicie antes de voltar ao launcher."
Stop-Transcript
Read-Host "Pressione Enter para fechar"
exit 0
"#,
        log_path = powershell_escape(&log_path),
        friendly_list = friendly_list,
        install_blocks = install_blocks,
    );
    fs::write(&script_path, script).map_err(|error| {
        LauncherError::technical("Não foi possível preparar instalador Windows", error)
    })?;
    Ok((script_path, log_path))
}

fn admin_temp_paths(prefix: &str, extension: &str) -> LauncherResult<(PathBuf, PathBuf)> {
    let log_dir = launcher_data_dir()?.join("logs");
    fs::create_dir_all(&log_dir)
        .map_err(|error| LauncherError::technical("Não foi possível criar pasta de logs", error))?;
    let suffix = timestamp_nanos();
    Ok((
        log_dir.join(format!("admin-{prefix}-{suffix}.log")),
        log_dir.join(format!("admin-{prefix}-{suffix}.{extension}")),
    ))
}

fn append_admin_log(ctx: &mut NativeJob<'_, '_>, log_path: &Path) {
    if let Ok(text) = fs::read_to_string(log_path) {
        append_limited(
            &mut ctx.stdout,
            &limit_lines(&text, UI_LOG_LINES),
            CAPTURE_LIMIT_BYTES,
        );
    }
}

fn prepare_project_source(ctx: &mut NativeJob<'_, '_>, project_dir: &Path) -> LauncherResult<()> {
    if let Some(parent) = project_dir.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta do projeto", error)
        })?;
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
        trim_installed_project_source(ctx, project_dir);
        return Ok(());
    }

    if compose_file.is_file() {
        ctx.log(
            "Clonando ou atualizando projeto",
            "Projeto já existe sem .git. Mantendo arquivos locais.",
            "info",
        );
        trim_installed_project_source(ctx, project_dir);
        return Ok(());
    }

    if project_dir.exists() {
        return Err(LauncherError::new(
            format!(
                "O caminho {} já existe, mas não parece ser o projeto M&G Pocket.",
                project_dir.display()
            ),
            format!(
                "Pasta existente sem .git e sem docker-compose.yml: {}",
                project_dir.display()
            ),
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
    trim_installed_project_source(ctx, project_dir);
    Ok(())
}

fn trim_installed_project_source(ctx: &mut NativeJob<'_, '_>, project_dir: &Path) {
    let launcher_dir = project_dir.join("launcher");
    if !launcher_dir.exists() {
        return;
    }

    if project_dir.join(".git").is_dir() {
        let sparse = run_capture(
            NativeCommand::new("git").args(vec![
                "-C".to_string(),
                path_string(project_dir),
                "sparse-checkout".to_string(),
                "set".to_string(),
                "--no-cone".to_string(),
                "/*".to_string(),
                "!/launcher/".to_string(),
            ]),
            MEDIUM_TIMEOUT,
            Some(ctx.job.cancel_flag()),
        );

        if sparse
            .as_ref()
            .map(|output| output.success)
            .unwrap_or(false)
        {
            ctx.log(
                "Organizando instalação",
                "Pasta launcher removida da cópia local via sparse checkout.",
                "info",
            );
            return;
        }

        ctx.log(
            "Organizando instalação",
            "Não foi possível ativar sparse checkout para remover launcher sem sujar o Git. Mantendo a pasta nesta instalação.",
            "error",
        );
        return;
    }

    match remove_dir_retry(&launcher_dir) {
        Ok(()) => ctx.log(
            "Organizando instalação",
            "Pasta launcher removida da instalação local.",
            "info",
        ),
        Err(error) => ctx.log(
            "Organizando instalação",
            &format!(
                "Não foi possível remover launcher local: {}",
                error.friendly_message()
            ),
            "error",
        ),
    }
}

fn prepare_project_files(project_dir: &Path) -> LauncherResult<()> {
    fs::create_dir_all(project_dir.join("storage").join("local").join("public"))
        .map_err(|error| LauncherError::technical("Não foi possível criar storage local", error))?;
    fs::create_dir_all(project_dir.join("public").join("uploads")).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta pública de uploads", error)
    })?;
    fs::create_dir_all(project_dir.join("installers")).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta técnica do projeto", error)
    })?;

    let env_file = project_dir.join(".env.docker-local");
    if env_file.is_file() {
        normalize_existing_env_file(&env_file)?;
        return Ok(());
    }

    let mut content = if project_dir.join(".env.example").is_file() {
        fs::read_to_string(project_dir.join(".env.example"))
            .map_err(|error| LauncherError::technical("Não foi possível ler .env.example", error))?
    } else {
        default_env_file()
    };

    let app_port = suggest_available_port(3000);
    let adminer_port = suggest_available_port(8081);
    let app_url = format!("http://localhost:{app_port}");
    let adminer_url = format!("http://localhost:{adminer_port}");
    content = upsert_env_var(&content, "APP_PORT", &app_port.to_string());
    content = upsert_env_var(&content, "ADMINER_PORT", &adminer_port.to_string());
    content = upsert_env_var(&content, "NEXTAUTH_URL", &app_url);
    content = upsert_env_var(&content, "NEXT_PUBLIC_BASE_URL", &app_url);
    content = upsert_env_var(&content, "ADMINER_URL", &adminer_url);
    content = upsert_env_var(&content, "STORAGE_LOCAL_PUBLIC_URL", "/uploads");

    let secret = format!("mg-pocket-local-{}", timestamp_nanos());
    if content
        .lines()
        .any(|line| line.starts_with("NEXTAUTH_SECRET="))
    {
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

    fs::write(&env_file, content).map_err(|error| {
        LauncherError::technical("Não foi possível criar .env.docker-local", error)
    })?;
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
    command_args.extend([
        "--project-name".to_string(),
        "app".to_string(),
        "down".to_string(),
        "--remove-orphans".to_string(),
    ]);
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
    command_args.extend(["--project-name".to_string(), project_name.to_string()]);
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
    retry_step(
        ctx,
        Duration::from_secs(120),
        Duration::from_secs(2),
        || {
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
        },
    )
    .map_err(|_| {
        LauncherError::friendly(
            "O banco de dados não ficou pronto a tempo. Veja os logs pelo launcher.",
        )
    })
}

fn wait_for_app_alive(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
) -> LauncherResult<()> {
    ctx.progress(
        "Aguardando app",
        "Validando /api/health sem depender do banco.",
        88,
    );
    let result = retry_step(ctx, Duration::from_secs(120), Duration::from_secs(2), || {
        app_healthcheck_success(ctx, compose, project_dir, "/api/health")
    });

    if result.is_ok() {
        return Ok(());
    }

    log_service_tail(ctx, compose, project_dir, "app", "Aguardando app");
    Err(LauncherError::friendly(
        "O aplicativo não respondeu ao healthcheck. Veja os logs do app.",
    ))
}

fn warn_if_database_unavailable(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
) {
    ctx.progress(
        "Validando banco",
        "Consultando /api/health/db pelo container app.",
        90,
    );

    let connected = retry_step(ctx, Duration::from_secs(30), Duration::from_secs(2), || {
        app_healthcheck_success(ctx, compose, project_dir, "/api/health/db")
    })
    .is_ok();

    if connected {
        ctx.log("Validando banco", "Banco conectado via /api/health/db.", "info");
        return;
    }

    ctx.log(
        "Validando banco",
        "O aplicativo iniciou, mas ainda não conseguiu conectar ao banco. Aguarde alguns segundos ou teste /api/health/db.",
        "error",
    );
    log_compose_service_status(ctx, compose, project_dir, "postgres", "Validando banco");
}

fn app_healthcheck_success(
    ctx: &NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
    path: &str,
) -> bool {
    let url = format!("http://localhost:3000{path}");
    run_capture(
        compose.command(
            project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "exec",
                "-T",
                "app",
                "wget",
                "--spider",
                "-q",
                &url,
            ],
        ),
        SHORT_TIMEOUT,
        Some(ctx.job.cancel_flag()),
    )
    .map(|output| output.success)
    .unwrap_or(false)
}

fn log_service_tail(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
    service: &str,
    step: &str,
) {
    if let Ok(output) = run_capture(
        compose.command(
            project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "logs",
                "--tail=80",
                service,
            ],
        ),
        SHORT_TIMEOUT,
        Some(ctx.job.cancel_flag()),
    ) {
        let logs = [output.stdout.trim(), output.stderr.trim()]
            .into_iter()
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>()
            .join("\n");
        if !logs.trim().is_empty() {
            ctx.log(step, &limit_lines(&logs, 80), "error");
        }
    }
}

fn log_compose_service_status(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
    service: &str,
    step: &str,
) {
    if let Ok(output) = run_capture(
        compose.command(
            project_dir,
            ["--env-file", ".env.docker-local", "ps", service],
        ),
        SHORT_TIMEOUT,
        Some(ctx.job.cancel_flag()),
    ) {
        let status = [output.stdout.trim(), output.stderr.trim()]
            .into_iter()
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>()
            .join("\n");
        if !status.trim().is_empty() {
            ctx.log(step, &limit_lines(&status, 20), "info");
        }
    }
}

fn run_seed_if_needed(
    ctx: &mut NativeJob<'_, '_>,
    compose: &ComposeCommand,
    project_dir: &Path,
) -> LauncherResult<()> {
    let seed_marker = project_dir
        .join("installers")
        .join(".seed-inicial-concluido");
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
                "run",
                "--rm",
                "--build",
                "maintenance",
                "npm",
                "run",
                "db:seed",
            ],
        ),
        LONG_TIMEOUT,
    )?;
    fs::write(seed_marker, "").map_err(|error| {
        LauncherError::technical("Não foi possível gravar marcador de seed", error)
    })?;
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
    let project_dir = project_dir();
    let app_port = local_service_port("APP_PORT", 3000, &project_dir);
    let adminer_port = local_service_port("ADMINER_PORT", 8081, &project_dir);
    let app_url = format!("http://localhost:{app_port}");
    let adminer_url = format!("http://localhost:{adminer_port}");
    ctx.progress(
        "Validando site/Adminer",
        &format!("Validando proxy local em {app_url}."),
        95,
    );
    retry_step(ctx, Duration::from_secs(120), Duration::from_secs(2), || {
        check_http_path(app_port, "/healthz", PORT_TIMEOUT)
    })
    .map_err(|_| LauncherError::friendly("O proxy local não iniciou. Verifique se a porta já está em uso."))?;

    retry_step(ctx, Duration::from_secs(120), Duration::from_secs(2), || {
        check_http_path(app_port, "/api/health", PORT_TIMEOUT)
    })
    .map_err(|_| {
        LauncherError::friendly(
            format!("O aplicativo não respondeu em {app_url}/api/health. Veja os logs do app."),
        )
    })?;

    if check_local_port(adminer_port, PORT_TIMEOUT) {
        ctx.log(
            "Validando site/Adminer",
            &format!("Adminer respondeu em {adminer_url}."),
            "info",
        );
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

fn build_system_status(
    quick: bool,
    cancel: Option<Arc<AtomicBool>>,
) -> LauncherResult<SystemStatus> {
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

    let git = command_version(
        NativeCommand::new("git").arg("--version"),
        QUICK_TIMEOUT,
        cancel.clone(),
    );
    let docker_version = command_version(
        NativeCommand::new("docker").arg("--version"),
        QUICK_TIMEOUT,
        cancel.clone(),
    );
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

    let sudo_docker = if cfg!(target_os = "linux")
        && docker_installed
        && docker_ps
            .as_ref()
            .map(|output| !output.success)
            .unwrap_or(true)
    {
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
        .and_then(|compose| {
            command_version(
                compose.command(Path::new("."), ["version"]),
                QUICK_TIMEOUT,
                cancel.clone(),
            )
        });

    let project_dir = project_dir();
    let app_port = local_service_port("APP_PORT", 3000, &project_dir);
    let adminer_port = local_service_port("ADMINER_PORT", 8081, &project_dir);
    let app_url = format!("http://localhost:{app_port}");
    let adminer_url = format!("http://localhost:{adminer_port}");
    let project_installed = project_dir.join("docker-compose.yml").is_file();
    let project_version = if project_installed && !quick {
        project_version(&project_dir, cancel.clone())
    } else if project_installed {
        Some("detectada".to_string())
    } else {
        None
    };

    let docker_running = docker_ps
        .as_ref()
        .map(|output| output.success)
        .unwrap_or(false)
        || sudo_docker
            .as_ref()
            .map(|output| output.success)
            .unwrap_or(false);
    let docker_permission_ok = docker_ps
        .as_ref()
        .map(|output| output.success)
        .unwrap_or(false);
    let sudo_docker_works = sudo_docker
        .as_ref()
        .map(|output| output.success)
        .unwrap_or(false);
    let project_diagnostics = if !quick && project_installed && docker_running {
        collect_project_diagnostics(&project_dir, cancel.clone())
    } else {
        ProjectDiagnostics::default()
    };
    let podman_installed = command_success("podman", ["--version"], QUICK_TIMEOUT);

    Ok(SystemStatus {
        os: os.to_string(),
        distro_family,
        distro_name,
        supported,
        winget_installed: (os == "windows")
            .then(|| command_success("winget", ["--version"], QUICK_TIMEOUT)),
        git_installed: Some(git.is_some()),
        power_shell_installed: (os == "windows").then(|| {
            command_success(
                "powershell.exe",
                ["-NoProfile", "-Command", "$PSVersionTable.PSVersion"],
                QUICK_TIMEOUT,
            )
        }),
        wsl2_installed: (os == "windows")
            .then(|| command_success("wsl.exe", ["--status"], QUICK_TIMEOUT)),
        docker_desktop_installed: (os == "windows").then(|| docker_desktop_installed()),
        docker_installed,
        docker_version,
        docker_running,
        docker_compose_installed: compose_version.is_some(),
        docker_compose_version: compose_version,
        docker_permission_ok: if os == "windows" {
            docker_running
        } else {
            docker_permission_ok
        },
        sudo_docker_works,
        requires_relogin: os == "linux" && !docker_permission_ok && sudo_docker_works,
        project_installed,
        project_path: Some(path_string(&project_dir)),
        project_version,
        app_url: Some(app_url.clone()),
        adminer_url: Some(adminer_url),
        app_online: project_diagnostics.app_online,
        adminer_online: check_local_port(adminer_port, PORT_TIMEOUT),
        podman_installed: Some(podman_installed),
        container_runtime: Some(if docker_installed {
            "docker".to_string()
        } else if podman_installed {
            "podman-ready".to_string()
        } else {
            "docker".to_string()
        }),
        port_3000_available: !check_local_port(3000, PORT_TIMEOUT),
        port_80_available: !check_local_port(80, PORT_TIMEOUT),
        port_443_available: !check_local_port(443, PORT_TIMEOUT),
        port_5432_available: !check_local_port(5432, PORT_TIMEOUT),
        database_connected: project_diagnostics.database_connected,
        containers_active: project_diagnostics.containers_active,
        nginx_online: project_diagnostics.nginx_online,
        uploads_directory_ok: project_diagnostics.uploads_directory_ok,
        uploads_served: project_diagnostics.uploads_served,
        next_assets_online: project_diagnostics.next_assets_online,
    })
}

#[derive(Default)]
struct ProjectDiagnostics {
    app_online: bool,
    database_connected: bool,
    containers_active: bool,
    nginx_online: bool,
    uploads_directory_ok: bool,
    uploads_served: bool,
    next_assets_online: bool,
}

fn collect_project_diagnostics(
    project_dir: &Path,
    cancel: Option<Arc<AtomicBool>>,
) -> ProjectDiagnostics {
    let Ok(compose) = resolve_compose_command(false, QUICK_TIMEOUT, cancel.clone()) else {
        return ProjectDiagnostics::default();
    };
    let app_port = local_service_port("APP_PORT", 3000, project_dir);
    let app_online = check_http_path(app_port, "/api/health", PORT_TIMEOUT);
    let database_connected = check_http_path(app_port, "/api/health/db", PORT_TIMEOUT);

    let running_services = run_capture(
        compose.command(
            project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "ps",
                "--services",
                "--filter",
                "status=running",
            ],
        ),
        QUICK_TIMEOUT,
        cancel.clone(),
    )
    .ok()
    .filter(|output| output.success)
    .map(|output| output.stdout)
    .unwrap_or_default();
    let containers_active = ["postgres", "app", "nginx"]
        .iter()
        .all(|service| running_services.lines().any(|line| line.trim() == *service));

    let uploads_directory_ok = run_capture(
        compose.command(
            project_dir,
            [
                "--env-file",
                ".env.docker-local",
                "exec",
                "-T",
                "app",
                "sh",
                "-lc",
                "test -d /app/uploads && test -w /app/uploads && printf ok > /app/uploads/.meg-pocket-health",
            ],
        ),
        SHORT_TIMEOUT,
        cancel,
    )
    .map(|output| output.success)
    .unwrap_or(false);

    ProjectDiagnostics {
        app_online,
        database_connected,
        containers_active,
        nginx_online: check_http_path(app_port, "/healthz", PORT_TIMEOUT),
        uploads_directory_ok,
        uploads_served: uploads_directory_ok
            && check_http_path(
                app_port,
                &format!("/uploads/{UPLOADS_HEALTH_FILE}"),
                PORT_TIMEOUT,
            ),
        next_assets_online: check_http_path(
            app_port,
            "/imgs/icons/logo_guerreiro.svg",
            PORT_TIMEOUT,
        ),
    }
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
        missing.push(
            if os == "windows" {
                "Docker Desktop"
            } else {
                "docker"
            }
            .to_string(),
        );
        packages.push(
            if os == "windows" {
                "Docker Desktop"
            } else {
                "docker"
            }
            .to_string(),
        );
    }
    if resolve_compose_command(false, QUICK_TIMEOUT, None).is_err() {
        missing.push("docker compose".to_string());
        packages.push(dependency_package(
            "docker_compose",
            distro_family.as_deref(),
        ));
    }

    if os == "linux" {
        for (program, package) in [("bash", "bash"), ("chmod", "coreutils")] {
            if !command_success(program, ["--version"], QUICK_TIMEOUT) {
                missing.push(program.to_string());
                packages.push(package.to_string());
            }
        }
    }

    let winget_installed =
        os == "windows" && command_success("winget", ["--version"], QUICK_TIMEOUT);
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
                "O launcher pode instalar Git e Docker Desktop via winget após sua confirmação."
                    .to_string();
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
    run_streaming_command_with_files(
        app, job_id, action, step, progress, command, timeout, cancel, None, None,
    )
}

#[allow(clippy::too_many_arguments)]
fn run_streaming_command_with_files(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    progress: u8,
    command: NativeCommand,
    timeout: Duration,
    cancel: Arc<AtomicBool>,
    stdin_file: Option<&Path>,
    stdout_file: Option<&Path>,
) -> Result<CommandOutput, ProcessError> {
    let display = command.display();
    jobs::emit_log(
        app,
        job_id,
        action,
        step,
        &format!("Executando: {display}"),
        progress,
        "info",
    );

    let mut process = command.into_command();
    if let Some(stdin_file) = stdin_file {
        let file = fs::File::open(stdin_file)
            .map_err(|error| ProcessError::spawn(display.clone(), error))?;
        process.stdin(Stdio::from(file));
    }
    if let Some(stdout_file) = stdout_file {
        if let Some(parent) = stdout_file.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| ProcessError::spawn(display.clone(), error))?;
        }
        let file = fs::File::create(stdout_file)
            .map_err(|error| ProcessError::spawn(display.clone(), error))?;
        process.stdout(Stdio::from(file));
    } else {
        process.stdout(Stdio::piped());
    }
    process.stderr(Stdio::piped());
    let mut child = process
        .spawn()
        .map_err(|error| ProcessError::spawn(display.clone(), error))?;

    let stdout = if stdout_file.is_some() {
        None
    } else {
        child.stdout.take()
    };
    let stderr = child.stderr.take();
    let (sender, receiver) = mpsc::channel::<StreamLine>();

    let stdout_handle =
        stdout.map(|stdout| spawn_line_reader(stdout, StreamKind::Stdout, sender.clone()));
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
            drain_streams(
                &receiver,
                &mut stdout_text,
                &mut stderr_text,
                &mut stdout_batch,
                &mut stderr_batch,
            );
            join_line_readers(stdout_handle, stderr_handle);
            flush_stream_batches(
                app,
                job_id,
                action,
                step,
                progress,
                &mut stdout_batch,
                &mut stderr_batch,
            );
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
                drain_streams(
                    &receiver,
                    &mut stdout_text,
                    &mut stderr_text,
                    &mut stdout_batch,
                    &mut stderr_batch,
                );
                join_line_readers(stdout_handle, stderr_handle);
                drain_streams(
                    &receiver,
                    &mut stdout_text,
                    &mut stderr_text,
                    &mut stdout_batch,
                    &mut stderr_batch,
                );
                flush_stream_batches(
                    app,
                    job_id,
                    action,
                    step,
                    progress,
                    &mut stdout_batch,
                    &mut stderr_batch,
                );
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
            drain_streams(
                &receiver,
                &mut stdout_text,
                &mut stderr_text,
                &mut stdout_batch,
                &mut stderr_batch,
            );
            join_line_readers(stdout_handle, stderr_handle);
            flush_stream_batches(
                app,
                job_id,
                action,
                step,
                progress,
                &mut stdout_batch,
                &mut stderr_batch,
            );
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
            prefix: vec![
                "-n".to_string(),
                "docker".to_string(),
                "compose".to_string(),
            ],
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
        return Err(LauncherError::friendly(
            "Caminho local do projeto está vazio.",
        ));
    }

    if path.parent().is_none() {
        return Err(LauncherError::friendly(
            "Caminho local do projeto precisa estar dentro de uma pasta de usuário.",
        ));
    }

    let path_text = path_string(path);
    if path_text == "/" || path_text == "\\" {
        return Err(LauncherError::friendly(
            "Caminho local do projeto inválido.",
        ));
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
    if haystack.contains("arch") || haystack.contains("manjaro") || haystack.contains("endeavouros")
    {
        "arch_like"
    } else if haystack.contains("ubuntu")
        || haystack.contains("linuxmint")
        || haystack.contains("pop")
    {
        "ubuntu_like"
    } else if haystack.contains("debian") {
        "debian_like"
    } else if haystack.contains("fedora")
        || haystack.contains("rhel")
        || haystack.contains("centos")
    {
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

fn check_http_path(port: u16, path: &str, timeout: Duration) -> bool {
    let addr = ("127.0.0.1", port)
        .to_socket_addrs()
        .ok()
        .and_then(|mut addrs| addrs.next());
    let Some(addr) = addr else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, timeout) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));
    let request = format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n");
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut buffer = [0_u8; 64];
    let Ok(bytes) = stream.read(&mut buffer) else {
        return false;
    };
    let response = String::from_utf8_lossy(&buffer[..bytes]);
    response.starts_with("HTTP/1.1 2") || response.starts_with("HTTP/1.0 2")
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

pub fn local_site_url() -> String {
    local_service_url("APP_PORT", 3000)
}

pub fn local_adminer_url() -> String {
    local_service_url("ADMINER_PORT", 8081)
}

fn local_service_url(port_key: &str, fallback_port: u16) -> String {
    let project_dir = project_dir();
    let env = read_env_file(&project_dir.join(".env.docker-local"));
    let port = env
        .get(port_key)
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(fallback_port);
    format!("http://localhost:{port}")
}

fn local_service_port(port_key: &str, fallback_port: u16, project_dir: &Path) -> u16 {
    let env = read_env_file(&project_dir.join(".env.docker-local"));
    env.get(port_key)
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(fallback_port)
}

fn read_env_file(path: &Path) -> HashMap<String, String> {
    let Ok(text) = fs::read_to_string(path) else {
        return HashMap::new();
    };

    parse_env_text(&text)
}

fn parse_env_text(text: &str) -> HashMap<String, String> {
    let mut values = HashMap::new();
    for raw_line in text.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let line = line.strip_prefix("export ").unwrap_or(line).trim();
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if key.is_empty() {
            continue;
        }
        values.insert(key.to_string(), parse_env_value(value.trim()));
    }
    values
}

fn parse_env_value(value: &str) -> String {
    if value.len() >= 2 {
        let first = value.as_bytes()[0] as char;
        let last = value.as_bytes()[value.len() - 1] as char;
        if (first == '"' || first == '\'') && first == last {
            return value[1..value.len() - 1].to_string();
        }
    }
    value.split(" #").next().unwrap_or(value).trim().to_string()
}

fn default_project_dir() -> PathBuf {
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

fn backup_dir() -> LauncherResult<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(user_profile) = env::var("USERPROFILE") {
            return Ok(PathBuf::from(user_profile)
                .join("Documents")
                .join("MG Pocket")
                .join("backups"));
        }
        if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
            return Ok(PathBuf::from(local_app_data)
                .join("mg-pocket")
                .join("backups"));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(home) = env::var("HOME") {
            let home = PathBuf::from(home);
            let documentos = home.join("Documentos");
            if documentos.is_dir() {
                return Ok(documentos.join("MG Pocket").join("backups"));
            }
            let documents = home.join("Documents");
            if documents.is_dir() {
                return Ok(documents.join("MG Pocket").join("backups"));
            }
            return Ok(home
                .join(".local")
                .join("share")
                .join("mg-pocket")
                .join("backups"));
        }
    }

    Err(LauncherError::friendly(
        "Não consegui resolver a pasta de backups.",
    ))
}

struct TempDirGuard {
    path: PathBuf,
    cleanup: bool,
}

impl TempDirGuard {
    fn new(prefix: &str) -> LauncherResult<Self> {
        let path = env::temp_dir().join(format!("{prefix}-{}", timestamp_nanos()));
        fs::create_dir_all(&path).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta temporária", error)
        })?;
        Ok(Self {
            path,
            cleanup: true,
        })
    }

    fn path(&self) -> &Path {
        &self.path
    }

    fn cleanup(&mut self) {
        if self.cleanup {
            let _ = remove_dir_retry(&self.path);
            self.cleanup = false;
        }
    }
}

impl Drop for TempDirGuard {
    fn drop(&mut self) {
        self.cleanup();
    }
}

fn default_backup_file_name() -> String {
    let suffix = timestamp_nanos();
    if cfg!(target_os = "windows") {
        format!("mg-pocket-backup-{suffix}.zip")
    } else {
        format!("mg-pocket-backup-{suffix}.tar.gz")
    }
}

fn validate_backup_file(path: &Path) -> LauncherResult<()> {
    if !path.is_file() {
        return Err(LauncherError::friendly(format!(
            "Backup não encontrado: {}",
            path.display()
        )));
    }
    if !backup_extension_valid(path) {
        return Err(LauncherError::friendly(
            "Formato de backup inválido para este sistema.",
        ));
    }
    Ok(())
}

fn backup_extension_valid(path: &Path) -> bool {
    let text = path.to_string_lossy().to_ascii_lowercase();
    if cfg!(target_os = "windows") {
        text.ends_with(".zip")
    } else {
        text.ends_with(".tar.gz") || text.ends_with(".tgz")
    }
}

fn validate_project_delete_path(path: &Path) -> LauncherResult<PathBuf> {
    let resolved = fs::canonicalize(path).map_err(|error| {
        LauncherError::technical("Não foi possível resolver pasta do projeto", error)
    })?;
    let home = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .ok()
        .map(PathBuf::from);
    let root = resolved.parent().is_none();
    if root
        || home
            .as_ref()
            .is_some_and(|home| fs::canonicalize(home).ok().as_ref() == Some(&resolved))
    {
        return Err(LauncherError::friendly("Caminho de remoção inválido."));
    }
    if !resolved.join("docker-compose.yml").is_file() || !resolved.join("package.json").is_file() {
        return Err(LauncherError::friendly(
            "Não encontrei os arquivos esperados do M&G Pocket. Remoção cancelada por segurança.",
        ));
    }

    let default = default_project_dir();
    let default_parent = default
        .parent()
        .ok_or_else(|| LauncherError::friendly("Caminho padrão do projeto local é inválido."))?;
    let _ = fs::create_dir_all(default_parent);
    let resolved_default = fs::canonicalize(default_parent)
        .map(|parent| parent.join("app"))
        .unwrap_or(default);
    let allow_custom = env::var("MG_POCKET_ALLOW_CUSTOM_PROJECT_DELETE")
        .ok()
        .as_deref()
        == Some("1");
    if resolved != resolved_default && !allow_custom {
        return Err(LauncherError::friendly(format!(
            "O caminho do projeto não é o diretório local esperado do launcher. Remoção cancelada por segurança: {}",
            resolved.display()
        )));
    }

    Ok(resolved)
}

fn copy_file_retry(source: &Path, destination: &Path) -> LauncherResult<()> {
    retry_io("copiar arquivo", || {
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(source, destination).map(|_| ())
    })
}

fn copy_dir_retry(source: &Path, destination: &Path) -> LauncherResult<()> {
    if !source.is_dir() {
        return Ok(());
    }
    retry_io("copiar pasta", || copy_dir_recursive(source, destination))
}

fn copy_dir_recursive(source: &Path, destination: &Path) -> std::io::Result<()> {
    fs::create_dir_all(destination)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_recursive(&source_path, &destination_path)?;
        } else {
            if let Some(parent) = destination_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(&source_path, &destination_path)?;
        }
    }
    Ok(())
}

fn remove_dir_retry(path: &Path) -> LauncherResult<()> {
    if !path.exists() {
        return Ok(());
    }
    retry_io("remover pasta", || fs::remove_dir_all(path))
}

fn rename_retry(source: &Path, destination: &Path) -> LauncherResult<()> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível preparar destino", error)
        })?;
    }
    if destination.exists() {
        remove_dir_retry(destination)?;
    }
    retry_io("mover pasta", || fs::rename(source, destination))
}

fn remove_file_if_exists(path: &Path) -> LauncherResult<()> {
    if path.is_file() {
        retry_io("remover arquivo", || fs::remove_file(path))?;
    }
    Ok(())
}

fn retry_io<F>(action: &str, mut operation: F) -> LauncherResult<()>
where
    F: FnMut() -> std::io::Result<()>,
{
    let mut last_error = None;
    for attempt in 0..5 {
        match operation() {
            Ok(()) => return Ok(()),
            Err(error) => {
                last_error = Some(error);
                thread::sleep(Duration::from_millis(80 * (attempt + 1)));
            }
        }
    }
    Err(LauncherError::technical(
        format!("Não foi possível {action}"),
        last_error
            .map(|error| error.to_string())
            .unwrap_or_else(|| "erro desconhecido".to_string()),
    ))
}

#[cfg(target_os = "windows")]
fn powershell_escape(path: &Path) -> String {
    path.to_string_lossy().replace('\'', "''")
}

fn compose_project_name() -> String {
    env::var("MG_POCKET_COMPOSE_PROJECT_NAME").unwrap_or_else(|_| COMPOSE_PROJECT.to_string())
}

fn dependency_package(dependency: &str, family: Option<&str>) -> String {
    match dependency {
        "docker_compose" => match family {
            Some("arch_like") => "docker-compose".to_string(),
            Some("ubuntu_like" | "debian_like" | "fedora_like") => {
                "docker-compose-plugin".to_string()
            }
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
    if missing.iter().any(|item| {
        item.eq_ignore_ascii_case("docker desktop") || item.eq_ignore_ascii_case("docker")
    }) {
        commands.push("winget show --id Docker.DockerDesktop --exact --source winget".to_string());
        commands.push("winget install -e --id Docker.DockerDesktop".to_string());
        commands
            .push("winget install --id Docker.DockerDesktop --exact --source winget".to_string());
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
            candidates.push(
                PathBuf::from(program_files)
                    .join("Docker")
                    .join("Docker")
                    .join("Docker Desktop.exe"),
            );
        }
        if let Ok(program_files_x86) = env::var("ProgramFiles(x86)") {
            candidates.push(
                PathBuf::from(program_files_x86)
                    .join("Docker")
                    .join("Docker")
                    .join("Docker Desktop.exe"),
            );
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

#[cfg(target_os = "windows")]
fn docker_desktop_path() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(program_files) = env::var("ProgramFiles") {
        candidates.push(
            PathBuf::from(program_files)
                .join("Docker")
                .join("Docker")
                .join("Docker Desktop.exe"),
        );
    }
    if let Ok(program_files_x86) = env::var("ProgramFiles(x86)") {
        candidates.push(
            PathBuf::from(program_files_x86)
                .join("Docker")
                .join("Docker")
                .join("Docker Desktop.exe"),
        );
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
    candidates.into_iter().find(|path| path.is_file())
}

#[cfg(not(target_os = "windows"))]
fn docker_desktop_path() -> Option<PathBuf> {
    None
}

fn normalize_existing_env_file(env_file: &Path) -> LauncherResult<()> {
    let content = fs::read_to_string(env_file).map_err(|error| {
        LauncherError::technical("Não foi possível ler .env.docker-local", error)
    })?;
    let next = upsert_env_var(&content, "STORAGE_LOCAL_PUBLIC_URL", "/uploads");

    if next != content {
        fs::write(env_file, next).map_err(|error| {
            LauncherError::technical("Não foi possível atualizar .env.docker-local", error)
        })?;
    }

    Ok(())
}

fn suggest_available_port(preferred: u16) -> u16 {
    for port in preferred..preferred.saturating_add(50) {
        if !check_local_port(port, PORT_TIMEOUT) {
            return port;
        }
    }

    preferred
}

fn upsert_env_var(content: &str, key: &str, value: &str) -> String {
    let replacement = format!("{key}=\"{}\"", value.replace('"', "\\\""));
    let mut found = false;
    let mut lines = content
        .lines()
        .map(|line| {
            if line.trim_start().starts_with(&format!("{key}=")) {
                found = true;
                replacement.clone()
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>();

    if !found {
        lines.push(replacement);
    }

    let mut next = lines.join("\n");
    next.push('\n');
    next
}

fn default_env_file() -> String {
    r#"DATABASE_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
DIRECT_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
NEXTAUTH_SECRET="meg-pocket-local-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
APP_PORT="3000"
ADMINER_PORT="8081"
STORAGE_DRIVER="local"
STORAGE_BUCKET="personagens"
STORAGE_LOCAL_DIR="./public/uploads"
STORAGE_LOCAL_PUBLIC_URL="/uploads"
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
    if value
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || "-_./:=@".contains(ch))
    {
        value.to_string()
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

#[cfg(target_os = "linux")]
fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
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
        for forbidden in [
            "pull",
            "clone",
            "up -d",
            "db:setup",
            "db:seed",
            "logs -f",
            "backup",
            "restore",
            "reset",
            "remove-local-project",
        ] {
            assert!(
                !text.contains(forbidden),
                "diagnóstico rápido não deve executar {forbidden}"
            );
        }
        assert!(commands
            .iter()
            .all(|command| command.contains("timeout=2s")));
    }

    #[test]
    fn capture_command_times_out() {
        let command = if cfg!(target_os = "windows") {
            NativeCommand::new("powershell.exe").args([
                "-NoProfile",
                "-Command",
                "Start-Sleep -Seconds 2",
            ])
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
        assert!(plan.contains(
            &"winget show --id Docker.DockerDesktop --exact --source winget".to_string()
        ));
        assert!(plan.contains(&"winget install -e --id Docker.DockerDesktop".to_string()));
        assert!(plan.contains(
            &"winget install --id Docker.DockerDesktop --exact --source winget".to_string()
        ));
    }

    #[test]
    fn parses_env_text_with_exports_quotes_and_inline_comments() {
        let env = parse_env_text(
            r#"
# comentario
export APP_PORT='3010'
ADMINER_PORT="8090"
STORAGE_LOCAL_PUBLIC_URL=/uploads # comentario inline
BROKEN_LINE
DATABASE_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
"#,
        );

        assert_eq!(env.get("APP_PORT").map(String::as_str), Some("3010"));
        assert_eq!(env.get("ADMINER_PORT").map(String::as_str), Some("8090"));
        assert_eq!(
            env.get("STORAGE_LOCAL_PUBLIC_URL").map(String::as_str),
            Some("/uploads")
        );
        assert_eq!(
            env.get("DATABASE_URL").map(String::as_str),
            Some("postgresql://meg:meg@localhost:5433/meg_pocket?schema=public")
        );
        assert!(!env.contains_key("BROKEN_LINE"));
    }

    #[test]
    fn upsert_env_var_updates_existing_key_without_duplicates() {
        let original = r#"APP_PORT="3000"
NEXTAUTH_URL="http://localhost:3000"
"#;

        let updated = upsert_env_var(original, "APP_PORT", "3010");

        assert!(updated.contains("APP_PORT=\"3010\""));
        assert!(updated.contains("NEXTAUTH_URL=\"http://localhost:3000\""));
        assert_eq!(
            updated
                .lines()
                .filter(|line| line.starts_with("APP_PORT="))
                .count(),
            1
        );
    }

    #[test]
    fn upsert_env_var_appends_missing_key_with_trailing_newline() {
        let updated = upsert_env_var("APP_PORT=\"3000\"\n", "ADMINER_PORT", "8082");

        assert!(updated.contains("APP_PORT=\"3000\""));
        assert!(updated.contains("ADMINER_PORT=\"8082\""));
        assert!(updated.ends_with('\n'));
    }

    #[test]
    fn default_env_file_is_local_upload_ready_and_omits_google_credentials() {
        let content = default_env_file();
        let env = parse_env_text(&content);

        assert!(!content.contains("GOOGLE_CLIENT_ID"));
        assert!(!content.contains("GOOGLE_CLIENT_SECRET"));
        assert_eq!(env.get("APP_PORT").map(String::as_str), Some("3000"));
        assert_eq!(env.get("ADMINER_PORT").map(String::as_str), Some("8081"));
        assert_eq!(
            env.get("STORAGE_LOCAL_DIR").map(String::as_str),
            Some("./public/uploads")
        );
        assert_eq!(
            env.get("STORAGE_LOCAL_PUBLIC_URL").map(String::as_str),
            Some("/uploads")
        );
    }

    #[test]
    fn validates_project_path() {
        assert!(validate_project_path(Path::new("mg-pocket/app")).is_ok());
        assert!(validate_project_path(Path::new("")).is_err());
        assert!(validate_project_path(Path::new("/")).is_err());
    }

    #[test]
    fn limit_lines_keeps_only_tail() {
        let text = (0..80)
            .map(|line| format!("linha {line}"))
            .collect::<Vec<_>>()
            .join("\n");
        let limited = limit_lines(&text, UI_LOG_LINES);
        assert_eq!(limited.lines().count(), UI_LOG_LINES);
        assert!(limited.starts_with("linha 30"));
        assert!(limited.ends_with("linha 79"));
    }

    #[test]
    fn backup_extension_matches_current_platform() {
        if cfg!(target_os = "windows") {
            assert!(backup_extension_valid(Path::new("backup.zip")));
            assert!(!backup_extension_valid(Path::new("backup.tar.gz")));
        } else {
            assert!(backup_extension_valid(Path::new("backup.tar.gz")));
            assert!(backup_extension_valid(Path::new("backup.tgz")));
            assert!(!backup_extension_valid(Path::new("backup.zip")));
        }
    }

    #[test]
    fn compose_down_command_only_removes_volumes_in_complete_mode() {
        let compose = ComposeCommand {
            program: "docker".to_string(),
            prefix: vec!["compose".to_string()],
        };
        let project = Path::new("/tmp/mg-pocket/app");

        let safe = compose_down_command(&compose, project, false);
        assert!(safe.args.iter().any(|arg| arg == "down"));
        assert!(safe.args.iter().any(|arg| arg == "--remove-orphans"));
        assert!(!safe.args.iter().any(|arg| arg == "-v"));

        let complete = compose_down_command(&compose, project, true);
        assert!(complete.args.iter().any(|arg| arg == "down"));
        assert!(complete.args.iter().any(|arg| arg == "--remove-orphans"));
        assert!(complete.args.iter().any(|arg| arg == "-v"));
    }

    #[test]
    fn compose_build_app_command_uses_no_cache_only_for_repair_and_light_env() {
        let compose = ComposeCommand {
            program: "docker".to_string(),
            prefix: vec!["compose".to_string()],
        };
        let project = Path::new("/tmp/mg-pocket/app");

        let normal = compose_build_app_command(&compose, project, false, false);
        assert!(normal.args.iter().any(|arg| arg == "build"));
        assert!(normal.args.iter().any(|arg| arg == "app"));
        assert!(!normal.args.iter().any(|arg| arg == "--no-cache"));
        assert!(normal.envs.is_empty());

        let repair_light = compose_build_app_command(&compose, project, true, true);
        assert!(repair_light.args.iter().any(|arg| arg == "--no-cache"));
        assert!(repair_light.envs.iter().any(|(key, value)| {
            key == "NEXT_REACT_COMPILER" && value == "false"
        }));
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
