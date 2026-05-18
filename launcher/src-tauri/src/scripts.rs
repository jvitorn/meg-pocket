use std::{
    env,
    ffi::OsString,
    fs,
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicU8, Ordering},
        Arc, Mutex,
    },
    thread,
};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use serde::Serialize;
use tauri::AppHandle;

use crate::{
    errors::{LauncherError, LauncherResult},
    installers::installers_dir,
    jobs::{self, JobManager},
    paths::launcher_data_dir,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandOutput {
    pub success: bool,
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

pub fn run_or_error(
    app: &AppHandle,
    job_manager: &JobManager,
    script_name: &str,
    action: &str,
    args: &[&str],
) -> LauncherResult<CommandOutput> {
    run_or_error_with_env(app, job_manager, script_name, action, args, &[])
}

pub fn run_or_error_with_env(
    app: &AppHandle,
    job_manager: &JobManager,
    script_name: &str,
    action: &str,
    args: &[&str],
    extra_env: &[(&str, &str)],
) -> LauncherResult<CommandOutput> {
    let job = job_manager.start(action)?;
    let progress = Arc::new(AtomicU8::new(0));

    jobs::emit_started(app, &job, "Iniciando", "Iniciando operação.", 0);

    let result = run_platform_script(app, &job, &progress, script_name, args, extra_env);
    match result {
        Ok(output) if output.success => {
            progress.store(100, Ordering::Relaxed);
            jobs::emit_finished(
                app,
                job.job_id(),
                job.action(),
                "Concluído",
                "Operação concluída.",
                100,
                "success",
            );
            Ok(output)
        }
        Ok(output) => {
            let error = script_failure_error(script_name, action, &output);
            jobs::emit_error(
                app,
                job.job_id(),
                job.action(),
                "Erro",
                error.technical_message(),
                progress.load(Ordering::Relaxed),
            );
            jobs::emit_finished(
                app,
                job.job_id(),
                job.action(),
                "Erro",
                error.friendly_message(),
                progress.load(Ordering::Relaxed),
                "error",
            );
            Err(error)
        }
        Err(error) => {
            jobs::emit_error(
                app,
                job.job_id(),
                job.action(),
                "Erro",
                error.technical_message(),
                progress.load(Ordering::Relaxed),
            );
            jobs::emit_finished(
                app,
                job.job_id(),
                job.action(),
                "Erro",
                error.friendly_message(),
                progress.load(Ordering::Relaxed),
                "error",
            );
            Err(error)
        }
    }
}

pub fn run_admin_or_error(
    app: &AppHandle,
    job_manager: &JobManager,
    script_name: &str,
    action: &str,
    args: &[&str],
) -> LauncherResult<CommandOutput> {
    #[cfg(target_os = "linux")]
    {
        let job = job_manager.start(action)?;
        let progress = Arc::new(AtomicU8::new(0));

        jobs::emit_started(app, &job, "Aguardando permissão", "Abrindo terminal administrativo.", 0);

        let result = run_linux_admin_script(app, &job, &progress, script_name, args);
        match result {
            Ok(output) if output.success => {
                progress.store(100, Ordering::Relaxed);
                jobs::emit_finished(
                    app,
                    job.job_id(),
                    job.action(),
                    "Concluído",
                    "Operação concluída.",
                    100,
                    "success",
                );
                Ok(output)
            }
            Ok(output) => {
                let error = script_failure_error(script_name, action, &output);
                jobs::emit_error(
                    app,
                    job.job_id(),
                    job.action(),
                    "Erro",
                    error.technical_message(),
                    progress.load(Ordering::Relaxed),
                );
                jobs::emit_finished(
                    app,
                    job.job_id(),
                    job.action(),
                    "Erro",
                    error.friendly_message(),
                    progress.load(Ordering::Relaxed),
                    "error",
                );
                Err(error)
            }
            Err(error) => {
                jobs::emit_error(
                    app,
                    job.job_id(),
                    job.action(),
                    "Erro",
                    error.technical_message(),
                    progress.load(Ordering::Relaxed),
                );
                jobs::emit_finished(
                    app,
                    job.job_id(),
                    job.action(),
                    "Erro",
                    error.friendly_message(),
                    progress.load(Ordering::Relaxed),
                    "error",
                );
                Err(error)
            }
        }
    }

    #[cfg(not(target_os = "linux"))]
    {
        run_or_error(app, job_manager, script_name, action, args)
    }
}

fn run_platform_script(
    app: &AppHandle,
    job: &jobs::JobGuard<'_>,
    progress: &Arc<AtomicU8>,
    script_name: &str,
    args: &[&str],
    extra_env: &[(&str, &str)],
) -> LauncherResult<CommandOutput> {
    update_progress(
        app,
        job.job_id(),
        job.action(),
        progress,
        "Preparando scripts",
        "Preparando scripts do launcher.",
        preparing_progress(script_name),
    );

    let script = platform_script_path(app, script_name)?;
    if !script.exists() {
        return Err(LauncherError::new(
            "Script do launcher não encontrado.",
            format!("Script não encontrado: {}", script.display()),
        ));
    }

    update_progress(
        app,
        job.job_id(),
        job.action(),
        progress,
        "Executando",
        "Executando script.",
        running_progress(script_name),
    );

    let mut command = build_script_command(&script, args);
    sanitize_child_environment(&mut command);
    for (key, value) in extra_env {
        command.env(key, value);
    }

    let mut child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| LauncherError::technical("Não foi possível executar script", error))?;

    let stdout = child.stdout.take().ok_or_else(|| {
        LauncherError::friendly("Não foi possível capturar a saída do script.")
    })?;
    let stderr = child.stderr.take().ok_or_else(|| {
        LauncherError::friendly("Não foi possível capturar os erros do script.")
    })?;

    let stdout_buffer = Arc::new(Mutex::new(String::new()));
    let stderr_buffer = Arc::new(Mutex::new(String::new()));

    let stdout_handle = spawn_stream_reader(
        app.clone(),
        job.job_id().to_string(),
        job.action().to_string(),
        script_name.to_string(),
        "stdout",
        stdout,
        Arc::clone(&stdout_buffer),
        Arc::clone(progress),
    );
    let stderr_handle = spawn_stream_reader(
        app.clone(),
        job.job_id().to_string(),
        job.action().to_string(),
        script_name.to_string(),
        "stderr",
        stderr,
        Arc::clone(&stderr_buffer),
        Arc::clone(progress),
    );

    let status = child
        .wait()
        .map_err(|error| LauncherError::technical("Não foi possível aguardar o script", error))?;

    let _ = stdout_handle.join();
    let _ = stderr_handle.join();

    Ok(CommandOutput {
        success: status.success(),
        code: status.code(),
        stdout: take_buffer(&stdout_buffer),
        stderr: take_buffer(&stderr_buffer),
    })
}

#[allow(clippy::too_many_arguments)]
fn spawn_stream_reader<R: Read + Send + 'static>(
    app: AppHandle,
    job_id: String,
    action: String,
    script_name: String,
    level: &'static str,
    reader: R,
    output: Arc<Mutex<String>>,
    progress: Arc<AtomicU8>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let reader = BufReader::new(reader);
        for line in reader.lines() {
            let line = match line {
                Ok(line) => line,
                Err(error) => {
                    jobs::emit_log(
                        &app,
                        &job_id,
                        &action,
                        "Logs",
                        &format!("Falha ao ler saída do processo: {error}"),
                        progress.load(Ordering::Relaxed),
                        "error",
                    );
                    break;
                }
            };

            let line = redact_sensitive(&line);

            if let Ok(mut buffer) = output.lock() {
                buffer.push_str(&line);
                buffer.push('\n');
            }

            let current_progress = progress.load(Ordering::Relaxed);
            jobs::emit_log(
                &app,
                &job_id,
                &action,
                "",
                &line,
                current_progress,
                level,
            );

            if let Some((step, message_progress)) = progress_hint(&script_name, &line) {
                update_progress(
                    &app,
                    &job_id,
                    &action,
                    &progress,
                    step,
                    &line,
                    message_progress,
                );
            }
        }
    })
}

fn update_progress(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    progress: &AtomicU8,
    step: &str,
    message: &str,
    next_progress: u8,
) {
    let current = progress.load(Ordering::Relaxed);
    if next_progress < current {
        return;
    }

    progress.store(next_progress, Ordering::Relaxed);
    jobs::emit_progress(app, job_id, action, step, message, next_progress);
}

fn take_buffer(buffer: &Arc<Mutex<String>>) -> String {
    buffer
        .lock()
        .map(|buffer| buffer.trim_end().to_string())
        .unwrap_or_default()
}

#[cfg(target_os = "linux")]
fn run_linux_admin_script(
    app: &AppHandle,
    job: &jobs::JobGuard<'_>,
    progress: &Arc<AtomicU8>,
    script_name: &str,
    args: &[&str],
) -> LauncherResult<CommandOutput> {
    let script = platform_script_path(app, script_name)?;
    let log_dir = launcher_data_dir()?.join("logs");
    fs::create_dir_all(&log_dir)
        .map_err(|error| LauncherError::technical("Não foi possível criar pasta de logs", error))?;

    let safe_job_id = job
        .job_id()
        .replace('/', "_")
        .replace('\\', "_")
        .replace(':', "_");
    let log_path = log_dir.join(format!("admin-{script_name}-{safe_job_id}.log"));
    let wrapper_path = log_dir.join(format!("admin-{script_name}-{safe_job_id}.sh"));
    let commands = admin_command_summary(script_name).join("\\n- ");
    let script_args = args
        .iter()
        .map(|arg| shell_quote(arg))
        .collect::<Vec<_>>()
        .join(" ");

    let wrapper = format!(
        r#"#!/usr/bin/env bash
set -uo pipefail
LOG_FILE={log_file}
SCRIPT={script}
echo "M&G Pocket Launcher" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Etapa: {action}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Esta etapa precisa de permissão administrativa." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Comandos que serão executados:" | tee -a "$LOG_FILE"
printf -- "- {commands}\n" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Se o sistema pedir senha, use a senha do seu usuário." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
bash "$SCRIPT" {args} 2>&1 | tee -a "$LOG_FILE"
code=${{PIPESTATUS[0]}}
echo "" | tee -a "$LOG_FILE"
if [ "$code" -eq 0 ]; then
  echo "Sucesso: etapa concluída." | tee -a "$LOG_FILE"
else
  echo "Falha: veja o log técnico em $LOG_FILE" | tee -a "$LOG_FILE"
fi
echo ""
read -r -p "Pressione Enter para fechar este terminal."
exit "$code"
"#,
        log_file = shell_quote(log_path.to_string_lossy().as_ref()),
        script = shell_quote(script.to_string_lossy().as_ref()),
        action = job.action(),
        commands = commands,
        args = script_args,
    );

    fs::write(&wrapper_path, wrapper)
        .map_err(|error| LauncherError::technical("Não foi possível preparar terminal administrativo", error))?;
    let mut permissions = fs::metadata(&wrapper_path)
        .map_err(|error| LauncherError::technical("Não foi possível ler script administrativo", error))?
        .permissions();
    permissions.set_mode(0o700);
    fs::set_permissions(&wrapper_path, permissions)
        .map_err(|error| LauncherError::technical("Não foi possível proteger script administrativo", error))?;

    update_progress(
        app,
        job.job_id(),
        job.action(),
        progress,
        "Terminal administrativo",
        "Aguardando conclusão no terminal externo.",
        20,
    );

    let status = run_terminal_and_wait(&wrapper_path)?;
    let stdout = fs::read_to_string(&log_path)
        .map(|text| limit_lines(&text, 500))
        .unwrap_or_default();
    let _ = fs::remove_file(&wrapper_path);

    Ok(CommandOutput {
        success: status.success(),
        code: status.code(),
        stdout,
        stderr: String::new(),
    })
}

#[cfg(target_os = "linux")]
fn run_terminal_and_wait(wrapper_path: &Path) -> LauncherResult<std::process::ExitStatus> {
    let wrapper = wrapper_path.to_string_lossy().to_string();
    let candidates: Vec<(&str, Vec<String>)> = vec![
        ("gnome-terminal", vec!["--wait".into(), "--".into(), "bash".into(), wrapper.clone()]),
        ("konsole", vec!["--nofork".into(), "-e".into(), "bash".into(), wrapper.clone()]),
        ("x-terminal-emulator", vec!["-e".into(), "bash".into(), wrapper.clone()]),
        ("xterm", vec!["-e".into(), "bash".into(), wrapper]),
    ];

    let mut last_error = None;
    for (program, args) in candidates {
        let mut command = Command::new(program);
        command.args(args);
        sanitize_child_environment(&mut command);
        match command.status() {
            Ok(status) => return Ok(status),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                last_error = Some(error);
            }
            Err(error) => {
                last_error = Some(error);
            }
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

#[cfg(target_os = "linux")]
fn admin_command_summary(script_name: &str) -> &'static [&'static str] {
    match script_name {
        "install-docker" => &[
            "verificar Docker",
            "instalar Docker e Docker Compose, se necessário",
            "iniciar o serviço docker",
            "ajustar o grupo docker para seu usuário",
        ],
        "install-system-dependencies" => &[
            "verificar Git, curl, Docker e Docker Compose",
            "instalar dependências ausentes pelo gerenciador de pacotes",
            "iniciar o serviço docker",
            "ajustar permissões do usuário",
        ],
        _ => &["executar etapa administrativa permitida pelo launcher"],
    }
}

#[cfg(target_os = "linux")]
fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn limit_lines(text: &str, max_lines: usize) -> String {
    let lines = text.lines().collect::<Vec<_>>();
    if lines.len() <= max_lines {
        return text.trim_end().to_string();
    }

    lines[lines.len().saturating_sub(max_lines)..].join("\n")
}

fn platform_script_path(app: &AppHandle, script_name: &str) -> LauncherResult<PathBuf> {
    if !allowed_script_name(script_name) {
        return Err(LauncherError::friendly(
            "Script não permitido pelo launcher.",
        ));
    }

    #[cfg(target_os = "windows")]
    {
        Ok(installers_dir(app)?
            .join("windows")
            .join(format!("{script_name}.ps1")))
    }

    #[cfg(target_os = "linux")]
    {
        Ok(installers_dir(app)?
            .join("linux")
            .join(format!("{script_name}.sh")))
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = app;
        let _ = script_name;
        Err(LauncherError::friendly(
            "Este launcher v1.1 oferece suporte operacional para Linux e Windows.",
        ))
    }
}

fn allowed_script_name(script_name: &str) -> bool {
    matches!(
        script_name,
        "backup"
            | "check-dependencies"
            | "doctor"
            | "ensure-docker-permission"
            | "ensure-docker-running"
            | "install-docker"
            | "install-project"
            | "install-system-dependencies"
            | "logs"
            | "remove-local-project"
            | "reset"
            | "restart"
            | "restore"
            | "start"
            | "stop"
    )
}

#[cfg(target_os = "windows")]
fn build_script_command(script: &Path, args: &[&str]) -> Command {
    let mut command = Command::new("powershell.exe");
    command
        .arg("-NoProfile")
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-File")
        .arg(script);
    command.args(args);
    command
}

#[cfg(not(target_os = "windows"))]
fn build_script_command(script: &Path, args: &[&str]) -> Command {
    let mut command = Command::new("bash");
    command.arg(script);
    command.args(args);
    command
}

pub fn sanitize_child_environment(command: &mut Command) {
    #[cfg(target_os = "linux")]
    {
        sanitize_linux_child_environment(command, env::var_os("APPIMAGE_ORIGINAL_PATH"));
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = command;
    }
}

#[cfg(target_os = "linux")]
pub(crate) fn sanitize_linux_child_environment(command: &mut Command, original_path: Option<OsString>) {
    let preserved_home = env::var_os("HOME");
    let preserved_path = original_path.or_else(|| env::var_os("PATH"));
    let preserved_user = env::var_os("USER");
    let preserved_shell = env::var_os("SHELL");
    let preserved_lang = env::var_os("LANG");
    let preserved_display = env::var_os("DISPLAY");
    let preserved_wayland = env::var_os("WAYLAND_DISPLAY");
    let preserved_xdg_runtime = env::var_os("XDG_RUNTIME_DIR");
    let preserved_dbus = env::var_os("DBUS_SESSION_BUS_ADDRESS");

    command.env_clear();
    set_env_if_present(command, "HOME", preserved_home);
    set_env_if_present(command, "PATH", preserved_path);
    set_env_if_present(command, "USER", preserved_user);
    set_env_if_present(command, "SHELL", preserved_shell);
    set_env_if_present(command, "LANG", preserved_lang);
    set_env_if_present(command, "DISPLAY", preserved_display);
    set_env_if_present(command, "WAYLAND_DISPLAY", preserved_wayland);
    set_env_if_present(command, "XDG_RUNTIME_DIR", preserved_xdg_runtime);
    set_env_if_present(command, "DBUS_SESSION_BUS_ADDRESS", preserved_dbus);

    for key in ["LD_LIBRARY_PATH", "APPDIR", "APPIMAGE", "ARGV0", "OWD"] {
        command.env_remove(key);
    }
}

#[cfg(target_os = "linux")]
fn set_env_if_present(command: &mut Command, key: &str, value: Option<OsString>) {
    if let Some(value) = value {
        command.env(key, value);
    }
}

fn preparing_progress(script_name: &str) -> u8 {
    match script_name {
        "check-dependencies" => 10,
        "ensure-docker-running" => 20,
        "ensure-docker-permission" => 30,
        "install-project" => 40,
        _ => 5,
    }
}

fn running_progress(script_name: &str) -> u8 {
    match script_name {
        "check-dependencies" => 10,
        "ensure-docker-running" => 20,
        "ensure-docker-permission" => 30,
        "install-project" => 50,
        _ => 10,
    }
}

fn progress_hint(script_name: &str, line: &str) -> Option<(&'static str, u8)> {
    let lower = line.to_ascii_lowercase();

    match script_name {
        "check-dependencies" => Some(("Verificando dependências", 10)),
        "ensure-docker-running" => Some(("Verificando Docker", 20)),
        "ensure-docker-permission" => Some(("Verificando permissões", 30)),
        "install-project" => {
            if lower.contains("docker") && (lower.contains("iniciando") || lower.contains("desktop")) {
                Some(("Verificando Docker", 20))
            } else if lower.contains("permiss") || lower.contains("grupo docker") || lower.contains("sudo") {
                Some(("Verificando permissões", 30))
            } else if lower.contains("projeto já existe")
                || lower.contains("git pull")
                || lower.contains("git clone")
                || lower.contains("baixando projeto")
                || lower.contains("atualizando")
            {
                Some(("Baixando ou atualizando projeto", 50))
            } else if lower.contains("subindo containers")
                || lower.contains("up -d")
                || lower.contains("building")
                || lower.contains("build")
            {
                Some(("Subindo containers", 70))
            } else if lower.contains("postgres")
                || lower.contains("banco")
                || lower.contains("database")
                || lower.contains("conexão")
            {
                Some(("Aguardando banco", 85))
            } else if lower.contains("migration")
                || lower.contains("migrations")
                || lower.contains("prisma")
                || lower.contains("seed")
                || lower.contains("validando")
                || lower.contains("testes automatizados")
            {
                Some(("Rodando seed/validação", 95))
            } else {
                None
            }
        }
        _ => None,
    }
}

fn script_failure_error(script_name: &str, action: &str, output: &CommandOutput) -> LauncherError {
    let technical = format!(
        "Script `{script_name}` falhou com código {:?}.\n\nSTDERR:\n{}\n\nSTDOUT:\n{}",
        output.code, output.stderr, output.stdout
    );
    let message = [output.stderr.trim(), output.stdout.trim()]
        .into_iter()
        .find(|message| !message.is_empty())
        .unwrap_or("Falha sem saída do script.");

    if is_friendly_error(message) {
        LauncherError::new(message.to_string(), technical)
    } else {
        LauncherError::new(
            format!("Não consegui concluir \"{action}\". Os detalhes técnicos foram enviados para Logs."),
            technical,
        )
    }
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

fn is_friendly_error(message: &str) -> bool {
    message.len() <= 220
        && !message.contains('\n')
        && !message.contains("/usr/")
        && !message.contains("/tmp/")
        && !message.contains("\\AppData\\")
        && !message.contains("symbol lookup error")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(target_os = "linux")]
    use std::ffi::OsStr;

    #[cfg(target_os = "linux")]
    fn command_env(command: &Command, key: &str) -> Option<Option<OsString>> {
        command
            .get_envs()
            .find(|entry| entry.0 == OsStr::new(key))
            .map(|(_, value)| value.map(OsString::from))
    }

    #[test]
    #[cfg(target_os = "linux")]
    fn sanitize_linux_child_environment_removes_appimage_loader_vars() {
        let mut command = Command::new("git");
        command.env("LD_LIBRARY_PATH", "/tmp/.mount/usr/lib");
        command.env("APPDIR", "/tmp/.mount");
        command.env("APPIMAGE", "/tmp/MG.AppImage");
        command.env("ARGV0", "mg-pocket-launcher");
        command.env("OWD", "/tmp");

        sanitize_linux_child_environment(
            &mut command,
            Some(OsString::from("/usr/local/bin:/usr/bin")),
        );

        assert_eq!(command_env(&command, "LD_LIBRARY_PATH"), Some(None));
        assert_eq!(command_env(&command, "APPDIR"), Some(None));
        assert_eq!(command_env(&command, "APPIMAGE"), Some(None));
        assert_eq!(command_env(&command, "ARGV0"), Some(None));
        assert_eq!(command_env(&command, "OWD"), Some(None));
        assert_eq!(
            command_env(&command, "PATH"),
            Some(Some(OsString::from("/usr/local/bin:/usr/bin")))
        );
    }
}
