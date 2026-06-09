pub mod backup;
pub mod diagnose;
pub mod download;
pub mod install;
pub mod maintenance;
pub mod nginx;
pub mod node;
pub mod postgres;
pub mod process;
pub mod types;

use std::{
    process::{Command, Stdio},
    time::{Duration, Instant},
};

use tauri::AppHandle;

use crate::{
    errors::{LauncherError, LauncherResult},
    jobs::{self, JobManager},
    scripts::{self, CommandOutput},
};

pub struct PortableJob<'app, 'manager> {
    app: &'app AppHandle,
    job: jobs::JobGuard<'manager>,
    current_step: String,
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
            progress: 0,
            stdout: String::new(),
            stderr: String::new(),
        }
    }

    fn started(&mut self, step: &str, message: &str, progress: u8) {
        self.current_step = step.to_string();
        self.progress = jobs::clamp_running_progress(progress);
        jobs::emit_started(self.app, &self.job, step, message, self.progress);
    }

    pub(crate) fn progress(&mut self, step: &str, message: &str, progress: u8) {
        self.current_step = step.to_string();
        self.progress = jobs::clamp_running_progress(progress).max(self.progress);
        jobs::emit_progress(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            message,
            self.progress,
        );
    }

    pub(crate) fn finalizing(&mut self, step: &str, message: &str, progress: u8) {
        self.current_step = step.to_string();
        self.progress = jobs::clamp_finalizing_progress(progress).max(self.progress);
        jobs::emit_finalizing_progress(
            self.app,
            self.job.job_id(),
            self.job.action(),
            step,
            message,
            self.progress,
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
        jobs::finish_job_success(self.app, self.job.job_id(), self.job.action(), step, message);
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
        jobs::finish_job_error(
            self.app,
            self.job.job_id(),
            self.job.action(),
            &self.current_step,
            &format!("Falhou na etapa: {}", self.current_step),
        );
    }

    fn finish_cancelled(&mut self) {
        jobs::finish_job_cancelled(self.app, self.job.job_id(), self.job.action(), &self.current_step);
    }

    fn append_output(&mut self, output: &CommandOutput) {
        append_limited(&mut self.stdout, &output.stdout);
        append_limited(&mut self.stderr, &output.stderr);
    }
}

pub fn quick_diagnose() -> LauncherResult<String> {
    diagnose::quick_status_json()
}

pub fn doctor(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<String> {
    let job = job_manager.start("Diagnosticar")?;
    let mut ctx = PortableJob::new(app, job);
    ctx.started(
        "Diagnóstico",
        "Verificando instalação portátil local.",
        0,
    );
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

pub fn repair_installation(app: &AppHandle, job_manager: &JobManager) -> LauncherResult<CommandOutput> {
    run_output_job(
        app,
        job_manager,
        "Reparar instalação",
        "Reparo",
        "Vamos reparar os arquivos do M&G Pocket sem apagar seus dados.",
        |ctx| {
            let _ = process::stop(ctx);
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
        return Err(LauncherError::friendly("Restore exige confirmação explícita."));
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
        return Err(LauncherError::friendly("Reset local exige confirmação explícita."));
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
    let mut child = command
        .spawn()
        .map_err(|error| LauncherError::technical(format!("Não foi possível executar {display}"), error))?;
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
                    stdout: stdout_handle.and_then(|handle| handle.join().ok()).unwrap_or_default(),
                    stderr: stderr_handle.and_then(|handle| handle.join().ok()).unwrap_or_default(),
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
                return Err(LauncherError::technical("Não foi possível acompanhar comando portátil", error));
            }
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err(LauncherError::new(
                format!("Falhou na etapa: {step}. O comando passou do tempo limite e foi cancelado."),
                format!("Timeout em comando portátil: {display}"),
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
    wait_until(Duration::from_secs(120), || {
        diagnose::check_http_path(config.public_port, "/healthz", Duration::from_millis(700))
    })?;
    ctx.finalizing("Validando acesso", "Validando uploads e aplicativo.", 98);
    wait_until(Duration::from_secs(120), || {
        diagnose::check_http_path(config.public_port, "/api/health", Duration::from_millis(700))
    })?;
    if !diagnose::check_http_path(
        config.public_port,
        "/uploads/.meg-pocket-health",
        Duration::from_millis(700),
    ) {
        return Err(LauncherError::friendly(
            "O M&G Pocket iniciou, mas os uploads locais não responderam. Use Reparar instalação.",
        ));
    }
    ctx.finalizing("Validando acesso", "Sistema portátil validado.", 99);
    Ok(())
}

fn wait_until<F>(timeout: Duration, mut check: F) -> LauncherResult<()>
where
    F: FnMut() -> bool,
{
    let start = Instant::now();
    while start.elapsed() < timeout {
        if check() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_secs(2));
    }
    Err(LauncherError::friendly(
        "Não foi possível validar o sistema local a tempo. Use Reparar instalação ou veja os logs técnicos.",
    ))
}

fn read_pipe<R: std::io::Read>(mut reader: R) -> String {
    let mut text = String::new();
    let _ = reader.read_to_string(&mut text);
    text
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
