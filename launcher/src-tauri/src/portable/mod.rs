pub mod backup;
pub mod diagnose;
pub mod download;
pub mod env;
pub mod install;
pub mod maintenance;
pub mod nginx;
pub mod node;
pub mod postgres;
pub mod process;
pub mod types;

use std::{
    fs,
    io::Read,
    path::Path,
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};

use tauri::AppHandle;

use crate::{
    errors::{LauncherError, LauncherResult},
    jobs::{self, JobManager},
    scripts::{self, CommandOutput},
};

const STEP_DIAGNOSTICO: &str = "diagnostico";
const STEP_RUNTIME: &str = "runtime";
const STEP_BANCO_LOCAL: &str = "bancoLocal";
const STEP_SISTEMA: &str = "sistema";
const STEP_ACESSO: &str = "acesso";

const PREPARATION_STEPS: [(&str, &str, u8, u8, &str); 5] = [
    (
        STEP_DIAGNOSTICO,
        "Diagnóstico",
        0,
        10,
        "Aguardando diagnóstico.",
    ),
    (STEP_RUNTIME, "Runtime", 10, 35, "Aguardando runtime."),
    (
        STEP_BANCO_LOCAL,
        "Banco local",
        35,
        60,
        "Aguardando banco local.",
    ),
    (STEP_SISTEMA, "Sistema", 60, 85, "Aguardando sistema."),
    (STEP_ACESSO, "Acesso", 85, 100, "Aguardando sistema."),
];

pub struct PortableJob<'app, 'manager> {
    app: &'app AppHandle,
    job: jobs::JobGuard<'manager>,
    current_step: String,
    current_step_id: Option<String>,
    steps: Vec<jobs::LauncherStep>,
    progress: u8,
    stdout: String,
    stderr: String,
}

impl<'app, 'manager> PortableJob<'app, 'manager> {
    fn new(app: &'app AppHandle, job: jobs::JobGuard<'manager>) -> Self {
        Self {
            app,
            job,
            current_step: "Iniciando".to_string(),
            current_step_id: None,
            steps: default_preparation_steps(),
            progress: 0,
            stdout: String::new(),
            stderr: String::new(),
        }
    }

    fn started(&mut self, step: &str, message: &str, progress: u8) {
        self.current_step = step.to_string();
        self.progress = jobs::clamp_running_progress(progress);
        self.update_structured_steps(step, message, self.progress, "running", None);
        jobs::emit_started_with_steps(
            self.app,
            &self.job,
            step,
            message,
            self.progress,
            self.current_step_id.as_deref(),
            self.steps.clone(),
        );
    }

    pub(crate) fn progress(&mut self, step: &str, message: &str, progress: u8) {
        self.current_step = step.to_string();
        self.progress = jobs::clamp_running_progress(progress).max(self.progress);
        self.update_structured_steps(step, message, self.progress, "running", None);
        jobs::emit_progress_with_steps(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            message,
            self.progress,
            self.current_step_id.as_deref(),
            self.steps.clone(),
        );
    }

    pub(crate) fn finalizing(&mut self, step: &str, message: &str, progress: u8) {
        self.current_step = step.to_string();
        self.progress = jobs::clamp_finalizing_progress(progress).max(self.progress);
        self.update_structured_steps(step, message, self.progress, "running", None);
        jobs::emit_finalizing_progress_with_steps(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            message,
            self.progress,
            self.current_step_id.as_deref(),
            self.steps.clone(),
        );
    }

    pub(crate) fn log(&mut self, step: &str, message: &str, level: &str) {
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

    fn finish_success(&mut self, step: &str, message: &str) -> CommandOutput {
        self.update_structured_steps(step, message, self.progress, "success", None);
        jobs::finish_job_success_with_steps(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            message,
            self.current_step_id.as_deref(),
            self.steps.clone(),
        );
        CommandOutput {
            success: true,
            code: Some(0),
            stdout: self.stdout.trim_end().to_string(),
            stderr: self.stderr.trim_end().to_string(),
        }
    }

    fn finish_error(&mut self, error: &LauncherError) {
        self.update_structured_steps(
            &self.current_step.clone(),
            error.friendly_message(),
            self.progress,
            "error",
            Some(error.technical_message()),
        );
        jobs::emit_error_with_steps(
            self.app,
            self.job.job_id(),
            self.job.action(),
            &self.current_step,
            error.technical_message(),
            self.progress,
            self.current_step_id.as_deref(),
            self.steps.clone(),
        );
        jobs::finish_job_error_with_steps(
            self.app,
            self.job.job_id(),
            self.job.action(),
            &self.current_step,
            &format!("Falhou na etapa: {}", self.current_step),
            self.current_step_id.as_deref(),
            self.steps.clone(),
        );
    }

    fn finish_cancelled(&mut self) {
        let current_step = self.current_step.clone();
        self.update_structured_steps(
            &current_step,
            "Cancelado pelo usuário.",
            self.progress,
            "cancelled",
            None,
        );
        jobs::finish_job_cancelled_with_steps(
            self.app,
            self.job.job_id(),
            self.job.action(),
            &self.current_step,
            self.progress,
            self.current_step_id.as_deref(),
            self.steps.clone(),
        );
    }

    fn append_output(&mut self, output: &CommandOutput) {
        append_limited(&mut self.stdout, &output.stdout);
        append_limited(&mut self.stderr, &output.stderr);
    }

    pub(crate) fn is_cancelled(&self) -> bool {
        self.job.is_cancelled()
    }

    pub(crate) fn check_cancelled(&self) -> LauncherResult<()> {
        if self.is_cancelled() {
            Err(LauncherError::friendly("Operação cancelada."))
        } else {
            Ok(())
        }
    }

    fn update_structured_steps(
        &mut self,
        step: &str,
        message: &str,
        progress: u8,
        status: &str,
        error: Option<&str>,
    ) {
        let step_id = preparation_step_id(step, progress);
        let current_index = preparation_step_index(step_id);
        let mark_all_success = status == "success" && progress >= 85;
        self.current_step_id = Some(step_id.to_string());

        for (index, launcher_step) in self.steps.iter_mut().enumerate() {
            if mark_all_success || index < current_index {
                launcher_step.status = "success".to_string();
                launcher_step.progress = 100;
                if launcher_step.message.trim().is_empty()
                    || launcher_step.message.starts_with("Aguardando")
                {
                    launcher_step.message = "Concluído.".to_string();
                }
                launcher_step.error = None;
                continue;
            }

            if launcher_step.id == step_id {
                launcher_step.status = status.to_string();
                launcher_step.progress = if status == "success" {
                    100
                } else {
                    step_progress_percent(step_id, progress).max(launcher_step.progress)
                };
                launcher_step.message = message.to_string();
                launcher_step.error = error.map(str::to_string);
                continue;
            }

            if status == "running" && index > current_index && launcher_step.status != "pending" {
                launcher_step.status = "pending".to_string();
                launcher_step.progress = 0;
                launcher_step.message = pending_step_message(&launcher_step.id).to_string();
                launcher_step.error = None;
            }
        }
    }
}

pub fn quick_diagnose() -> LauncherResult<String> {
    diagnose::quick_status_json()
}

pub fn doctor(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<String> {
    let job = job_manager.start("Diagnosticar")?;
    let mut ctx = PortableJob::new(app, job);
    ctx.started("Diagnóstico", "Verificando instalação portátil local.", 0);
    let result = diagnose::full_status_json();
    finish_string_job(ctx, result, "Finalizado", "Diagnóstico concluído.")
}

pub fn install_project(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<CommandOutput> {
    run_output_job(
        app,
        job_manager,
        "Preparar M&G Pocket",
        "Preparando",
        "Preparando o M&G Pocket neste computador. Isso pode levar alguns minutos na primeira vez.",
        |ctx| {
            download::install_or_repair_runtime(ctx)?;
            ctx.progress("Preparando banco local", "Preparando banco local.", 80);
            let _ = process::start(ctx)?;
            validate_health(ctx)?;
            Ok(())
        },
        "Concluído",
        "Ambiente portátil pronto.",
    )
}

pub fn repair_installation(
    app: &AppHandle,
    job_manager: &JobManager,
) -> LauncherResult<CommandOutput> {
    run_output_job(
        app,
        job_manager,
        "Reparar instalação",
        "Reparo",
        "Vamos reparar os arquivos do M&G Pocket sem apagar seus dados.",
        |ctx| {
            let _ = process::stop(ctx);
            postgres::prepare_for_repair(ctx)?;
            download::install_or_repair_runtime(ctx)?;
            validate_health(ctx)?;
            Ok(())
        },
        "Finalizado",
        "Reparo concluído.",
    )
}

pub fn start_app(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<CommandOutput> {
    run_output_job(
        app,
        job_manager,
        "Iniciar M&G Pocket",
        "Iniciando",
        "Iniciando sistema portátil local.",
        |ctx| {
            let _ = process::start(ctx)?;
            validate_health(ctx)
        },
        "Finalizado",
        "M&G Pocket iniciado.",
    )
}

pub fn stop_app(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<CommandOutput> {
    run_output_job(
        app,
        job_manager,
        "Parar M&G Pocket",
        "Parando",
        "Parando serviços portáteis.",
        process::stop,
        "Finalizado",
        "M&G Pocket parado. Dados locais preservados.",
    )
}

pub fn restart_app(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<CommandOutput> {
    run_output_job(
        app,
        job_manager,
        "Reiniciar M&G Pocket",
        "Reiniciando",
        "Reiniciando serviços portáteis.",
        |ctx| {
            let _ = process::restart(ctx)?;
            validate_health(ctx)
        },
        "Finalizado",
        "M&G Pocket reiniciado.",
    )
}

pub fn read_logs(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<String> {
    let job = job_manager.start("Ler logs")?;
    let mut ctx = PortableJob::new(app, job);
    ctx.started("Logs", "Carregando logs portáteis.", 0);
    let result = maintenance::read_logs();
    finish_string_job(ctx, result, "Finalizado", "Logs carregados.")
}

pub fn backup(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<CommandOutput> {
    run_output_job(
        app,
        job_manager,
        "Backup",
        "Backup",
        "Criando uma cópia de segurança dos seus dados. O backup inclui banco local e imagens enviadas.",
        |ctx| {
            let path = backup::backup(ctx)?;
            append_limited(&mut ctx.stdout, &path.to_string_lossy());
            Ok(())
        },
        "Backup concluído",
        "Backup concluído.",
    )
}

pub fn restore_backup(
    app: &AppHandle,
    job_manager: &JobManager,
    backup_path: String,
    confirmed: bool,
) -> LauncherResult<CommandOutput> {
    if !confirmed {
        return Err(LauncherError::friendly(
            "Restore exige confirmação explícita.",
        ));
    }
    run_output_job(
        app,
        job_manager,
        "Restaurar backup",
        "Restauração",
        "Restaurar backup vai substituir os dados atuais. Antes disso, vamos criar uma cópia de segurança do estado atual.",
        |ctx| backup::restore(ctx, backup_path.clone().into()),
        "Restauração concluída",
        "Backup restaurado.",
    )
}

pub fn reset_local_data(
    app: &AppHandle,
    job_manager: &JobManager,
    confirmed: bool,
) -> LauncherResult<CommandOutput> {
    if !confirmed {
        return Err(LauncherError::friendly(
            "Reset local exige confirmação explícita.",
        ));
    }
    run_output_job(
        app,
        job_manager,
        "Resetar dados locais",
        "Reset",
        "Preparando reset dos dados portáteis locais.",
        maintenance::reset_local_data,
        "Reset concluído",
        "Dados locais resetados.",
    )
}

pub fn local_site_url() -> String {
    diagnose::configured_app_url()
}

pub(crate) fn run_command(
    ctx: &mut PortableJob<'_, '_>,
    step: &str,
    message: &str,
    progress: u8,
    command: &mut Command,
    timeout: Duration,
) -> LauncherResult<CommandOutput> {
    ctx.progress(step, message, progress);
    scripts::prepare_child_command(command);
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let display = format!("{command:?}");
    let mut child = command.spawn().map_err(|error| {
        LauncherError::technical(format!("Não foi possível executar {display}"), error)
    })?;
    let cancel = ctx.job.cancel_flag();
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdout_handle = stdout.map(|stdout| std::thread::spawn(move || read_pipe(stdout)));
    let stderr_handle = stderr.map(|stderr| std::thread::spawn(move || read_pipe(stderr)));
    let started = Instant::now();

    loop {
        if cancel.load(std::sync::atomic::Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            return Err(LauncherError::friendly("Operação cancelada."));
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                let output = CommandOutput {
                    success: status.success(),
                    code: status.code(),
                    stdout: stdout_handle
                        .and_then(|handle| handle.join().ok())
                        .unwrap_or_default(),
                    stderr: stderr_handle
                        .and_then(|handle| handle.join().ok())
                        .unwrap_or_default(),
                };
                ctx.append_output(&output);
                if output.success {
                    return Ok(output);
                }
                return Err(LauncherError::new(
                    format!("Falhou na etapa: {step}."),
                    format!(
                        "Comando portátil falhou: {display}\nSTDERR:\n{}\nSTDOUT:\n{}",
                        output.stderr, output.stdout
                    ),
                ));
            }
            Ok(None) => {}
            Err(error) => {
                let _ = child.kill();
                return Err(LauncherError::technical(
                    "Não foi possível acompanhar comando portátil",
                    error,
                ));
            }
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(LauncherError::new(
                format!(
                    "Falhou na etapa: {step}. O comando passou do tempo limite e foi cancelado."
                ),
                format!("Timeout em comando portátil: {display}"),
            ));
        }

        std::thread::sleep(Duration::from_millis(80));
    }
}

pub(crate) fn run_daemon_start_command(
    ctx: &mut PortableJob<'_, '_>,
    step: &str,
    message: &str,
    progress: u8,
    command: &mut Command,
    timeout: Duration,
    output_log_path: Option<&Path>,
) -> LauncherResult<CommandOutput> {
    ctx.progress(step, message, progress);
    scripts::prepare_child_command(command);
    let display = format!("{command:?}");
    let output =
        run_daemon_start_command_raw(command, timeout, ctx.job.cancel_flag(), output_log_path)?;
    ctx.append_output(&output);
    if output.success {
        return Ok(output);
    }
    Err(LauncherError::new(
        format!("Falhou na etapa: {step}."),
        format!("Comando de serviço portátil falhou: {display}"),
    ))
}

fn run_daemon_start_command_raw(
    command: &mut Command,
    timeout: Duration,
    cancel: Arc<AtomicBool>,
    output_log_path: Option<&Path>,
) -> LauncherResult<CommandOutput> {
    command.stdin(Stdio::null());
    if let Some(path) = output_log_path {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                LauncherError::technical("Não foi possível criar pasta de logs", error)
            })?;
        }
        let stdout = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|error| {
                LauncherError::technical("Não foi possível abrir log do serviço", error)
            })?;
        let stderr = stdout.try_clone().map_err(|error| {
            LauncherError::technical("Não foi possível abrir log do serviço", error)
        })?;
        command
            .stdout(Stdio::from(stdout))
            .stderr(Stdio::from(stderr));
    } else {
        command.stdout(Stdio::null()).stderr(Stdio::null());
    }

    let display = format!("{command:?}");
    let mut child = command.spawn().map_err(|error| {
        LauncherError::technical(format!("Não foi possível executar {display}"), error)
    })?;
    let started = Instant::now();

    loop {
        if cancel.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            return Err(LauncherError::friendly("Operação cancelada."));
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                return Ok(CommandOutput {
                    success: status.success(),
                    code: status.code(),
                    stdout: String::new(),
                    stderr: String::new(),
                });
            }
            Ok(None) => {}
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(LauncherError::technical(
                    "Não foi possível acompanhar serviço portátil",
                    error,
                ));
            }
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(LauncherError::new(
                "O serviço portátil demorou demais para responder e foi interrompido.",
                format!("Timeout em comando de serviço portátil: {display}"),
            ));
        }

        std::thread::sleep(Duration::from_millis(80));
    }
}

fn run_output_job<F>(
    app: &AppHandle,
    job_manager: &JobManager,
    action: &str,
    first_step: &str,
    first_message: &str,
    operation: F,
    success_step: &str,
    success_message: &str,
) -> LauncherResult<CommandOutput>
where
    F: FnOnce(&mut PortableJob<'_, '_>) -> LauncherResult<()>,
{
    let job = job_manager.start(action)?;
    let mut ctx = PortableJob::new(app, job);
    ctx.started(first_step, first_message, 0);
    let result = operation(&mut ctx);
    match result {
        Ok(()) => Ok(ctx.finish_success(success_step, success_message)),
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

fn finish_string_job(
    mut ctx: PortableJob<'_, '_>,
    result: LauncherResult<String>,
    success_step: &str,
    success_message: &str,
) -> LauncherResult<String> {
    match result {
        Ok(value) => {
            ctx.finish_success(success_step, success_message);
            Ok(value)
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

fn validate_health(ctx: &mut PortableJob<'_, '_>) -> LauncherResult<()> {
    let config = install::read_or_create_runtime_config()?;
    ctx.finalizing("Validando acesso", "Validando Nginx portátil.", 96);
    wait_until(ctx, Duration::from_secs(120), || {
        diagnose::check_http_path(config.public_port, "/healthz", Duration::from_millis(700))
    })
    .map_err(|_| {
        nginx::nginx_error_with_logs(
            "O Nginx portátil não respondeu na validação final.",
            format!(
                "Timeout aguardando http://127.0.0.1:{}/healthz durante validação final.",
                config.public_port
            ),
        )
    })?;
    ctx.finalizing("Validando acesso", "Validando uploads e aplicativo.", 98);
    wait_until(ctx, Duration::from_secs(120), || {
        diagnose::check_http_path(
            config.public_port,
            "/api/health",
            Duration::from_millis(700),
        )
    })
    .map_err(|_| {
        next_error_with_log(
            "O aplicativo Next portátil não respondeu.",
            format!(
                "Timeout aguardando http://127.0.0.1:{}/api/health durante validação final.",
                config.public_port
            ),
        )
    })?;
    if !diagnose::check_http_path(
        config.public_port,
        "/uploads/.meg-pocket-health",
        Duration::from_millis(700),
    ) {
        return Err(nginx::nginx_error_with_logs(
            "O M&G Pocket iniciou, mas os uploads locais não responderam.",
            format!(
                "Falha validando alias de uploads em http://127.0.0.1:{}/uploads/.meg-pocket-health.",
                config.public_port
            ),
        ));
    }
    ctx.finalizing("Validando acesso", "Sistema portátil validado.", 99);
    Ok(())
}

fn next_error_with_log(friendly: impl Into<String>, technical: impl Into<String>) -> LauncherError {
    let log_path = crate::paths::mg_pocket_logs_dir()
        .ok()
        .map(|path| path.join("app.log"));
    let log_text = log_path
        .as_ref()
        .and_then(|path| fs::read_to_string(path).ok())
        .filter(|text| !text.trim().is_empty())
        .map(|text| tail_for_error(&text, 128 * 1024).to_string())
        .unwrap_or_else(|| "(vazio ou indisponível)".to_string());
    let log_label = log_path
        .as_ref()
        .map(|path| path.display().to_string())
        .unwrap_or_else(|| "app.log".to_string());

    LauncherError::new(
        friendly,
        format!(
            "{}\n\nConteúdo de {}:\n{}",
            technical.into(),
            log_label,
            log_text
        ),
    )
}

fn wait_until<F>(ctx: &PortableJob<'_, '_>, timeout: Duration, mut check: F) -> LauncherResult<()>
where
    F: FnMut() -> bool,
{
    let start = Instant::now();
    while start.elapsed() < timeout {
        ctx.check_cancelled()?;
        if check() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_secs(2));
    }
    Err(LauncherError::friendly(
        "Não foi possível validar o sistema local a tempo. Use Reparar instalação ou veja os logs técnicos.",
    ))
}

fn read_pipe<R: Read>(mut reader: R) -> String {
    let mut text = String::new();
    let _ = reader.read_to_string(&mut text);
    text
}

fn tail_for_error(text: &str, limit: usize) -> &str {
    if text.len() <= limit {
        text
    } else {
        text.get(text.len().saturating_sub(limit)..).unwrap_or(text)
    }
}

fn default_preparation_steps() -> Vec<jobs::LauncherStep> {
    PREPARATION_STEPS
        .iter()
        .map(|(id, title, _, _, message)| jobs::LauncherStep {
            id: (*id).to_string(),
            title: (*title).to_string(),
            status: "pending".to_string(),
            progress: 0,
            message: (*message).to_string(),
            started_at: None,
            finished_at: None,
            error: None,
        })
        .collect()
}

fn preparation_step_id(step: &str, progress: u8) -> &'static str {
    let text = step.to_ascii_lowercase();
    if text.contains("diagn") {
        return STEP_DIAGNOSTICO;
    }
    if text.contains("banco")
        || text.contains("postgres")
        || text.contains("initdb")
        || text.contains("psql")
        || text.contains("migrations")
        || text.contains("seed")
        || text.contains("dados iniciais")
        || text.contains("meg_pocket")
    {
        return STEP_BANCO_LOCAL;
    }
    if text.contains("acesso") || text.contains("health") || text.contains("uploads") {
        return STEP_ACESSO;
    }
    if text.contains("sistema")
        || text.contains("next")
        || text.contains("nginx")
        || text.contains("servi")
    {
        return STEP_SISTEMA;
    }
    if text.contains("runtime")
        || text.contains("baixando")
        || text.contains("download")
        || text.contains("extraindo")
        || text.contains("arquivos necessários")
    {
        return STEP_RUNTIME;
    }

    match progress {
        0..=10 => STEP_DIAGNOSTICO,
        11..=35 => STEP_RUNTIME,
        36..=60 => STEP_BANCO_LOCAL,
        61..=85 => STEP_SISTEMA,
        _ => STEP_ACESSO,
    }
}

fn preparation_step_index(step_id: &str) -> usize {
    PREPARATION_STEPS
        .iter()
        .position(|(id, _, _, _, _)| *id == step_id)
        .unwrap_or(0)
}

fn pending_step_message(step_id: &str) -> &'static str {
    PREPARATION_STEPS
        .iter()
        .find(|(id, _, _, _, _)| *id == step_id)
        .map(|(_, _, _, _, message)| *message)
        .unwrap_or("Aguardando.")
}

fn step_progress_percent(step_id: &str, progress: u8) -> u8 {
    let Some((_, _, start, end, _)) = PREPARATION_STEPS
        .iter()
        .find(|(id, _, _, _, _)| *id == step_id)
    else {
        return progress.min(100);
    };

    if progress <= *start {
        return 0;
    }
    if progress >= *end {
        return 100;
    }

    let span = (*end - *start).max(1) as u16;
    let done = (progress - *start) as u16;
    ((done * 100) / span) as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn daemon_start_command_does_not_wait_for_background_stdout_holder() {
        let cancel = Arc::new(AtomicBool::new(false));
        let mut command = Command::new("sh");
        command.args(["-c", "(sleep 2) &"]);

        let started = Instant::now();
        let output =
            run_daemon_start_command_raw(&mut command, Duration::from_secs(5), cancel, None)
                .expect("comando daemon deve finalizar");

        assert!(output.success);
        assert!(started.elapsed() < Duration::from_secs(1));
    }

    #[test]
    fn structured_step_progress_maps_global_ranges_to_step_percentages() {
        assert_eq!(
            preparation_step_id("Iniciando PostgreSQL portátil", 48),
            STEP_BANCO_LOCAL
        );
        assert_eq!(step_progress_percent(STEP_BANCO_LOCAL, 48), 52);
        assert_eq!(preparation_step_id("Validando acesso", 96), STEP_ACESSO);
    }
}

fn append_limited(buffer: &mut String, text: &str) {
    if !buffer.is_empty() && !text.trim().is_empty() {
        buffer.push('\n');
    }
    buffer.push_str(text.trim_end());
    if buffer.len() > 512 * 1024 {
        if let Some(slice) = buffer.get(buffer.len() - 512 * 1024..) {
            *buffer = slice.to_string();
        }
    }
}
