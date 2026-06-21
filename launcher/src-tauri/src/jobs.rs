use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::errors::{LauncherError, LauncherResult};

pub const JOB_STARTED: &str = "launcher://job-started";
pub const JOB_PROGRESS: &str = "launcher://job-progress";
pub const JOB_LOG: &str = "launcher://job-log";
pub const JOB_ERROR: &str = "launcher://job-error";
pub const JOB_FINISHED: &str = "launcher://job-finished";
const RUNNING_PROGRESS_MAX: u8 = 95;

#[derive(Clone, Serialize)]
pub struct LauncherStep {
    pub id: String,
    pub title: String,
    pub status: String,
    pub progress: u8,
    pub message: String,
    #[serde(rename = "startedAt", skip_serializing_if = "Option::is_none")]
    pub started_at: Option<String>,
    #[serde(rename = "finishedAt", skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct LauncherJobEvent {
    pub job_id: String,
    pub action: String,
    pub step: String,
    pub message: String,
    pub progress: u8,
    pub level: String,
    pub status: String,
    #[serde(rename = "currentStepId", skip_serializing_if = "Option::is_none")]
    pub current_step_id: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub steps: Vec<LauncherStep>,
    /// Typed error kind — never "cancelled_by_user" for timeout, never "timeout" for real cancellation.
    #[serde(rename = "errorKind", skip_serializing_if = "Option::is_none")]
    pub error_kind: Option<String>,
    /// Bytes transferred so far (download progress).
    #[serde(rename = "transferredBytes", skip_serializing_if = "Option::is_none")]
    pub transferred_bytes: Option<u64>,
    /// Total expected bytes (download progress).
    #[serde(rename = "totalBytes", skip_serializing_if = "Option::is_none")]
    pub total_bytes: Option<u64>,
    /// Files processed so far (extraction progress).
    #[serde(rename = "filesProcessed", skip_serializing_if = "Option::is_none")]
    pub files_processed: Option<u64>,
    /// Total file count (extraction progress).
    #[serde(rename = "totalFiles", skip_serializing_if = "Option::is_none")]
    pub total_files: Option<u64>,
    /// Transfer speed in bytes/s.
    #[serde(rename = "bytesPerSecond", skip_serializing_if = "Option::is_none")]
    pub bytes_per_second: Option<u64>,
    /// Seconds elapsed since the operation started.
    #[serde(rename = "elapsedSeconds", skip_serializing_if = "Option::is_none")]
    pub elapsed_seconds: Option<u64>,
}

#[derive(Default)]
pub struct JobManager {
    active: Mutex<Option<ActiveJob>>,
    counter: AtomicU64,
}

#[derive(Clone)]
struct ActiveJob {
    job_id: String,
    cancelled: Arc<AtomicBool>,
}

pub struct JobGuard<'a> {
    manager: &'a JobManager,
    job_id: String,
    action: String,
    cancelled: Arc<AtomicBool>,
}

impl JobManager {
    pub fn start(&self, action: &str) -> LauncherResult<JobGuard<'_>> {
        let mut active = self.active.lock().map_err(|_| {
            LauncherError::friendly("O controle de jobs do launcher ficou indisponível.")
        })?;

        if active.is_some() {
            return Err(LauncherError::friendly(
                "Já existe uma operação em andamento. Aguarde ela terminar antes de iniciar outra.",
            ));
        }

        let job_id = format!(
            "{}-{}",
            timestamp_millis(),
            self.counter.fetch_add(1, Ordering::Relaxed)
        );
        let cancelled = Arc::new(AtomicBool::new(false));
        *active = Some(ActiveJob {
            job_id: job_id.clone(),
            cancelled: Arc::clone(&cancelled),
        });

        Ok(JobGuard {
            manager: self,
            job_id,
            action: action.to_string(),
            cancelled,
        })
    }

    pub fn cancel_active(&self) -> LauncherResult<Option<String>> {
        let active = self.active.lock().map_err(|_| {
            LauncherError::friendly("O controle de jobs do launcher ficou indisponível.")
        })?;

        if let Some(active) = active.as_ref() {
            active.cancelled.store(true, Ordering::Relaxed);
            return Ok(Some(active.job_id.clone()));
        }

        Ok(None)
    }

    pub fn has_active_job(&self) -> bool {
        self.active
            .lock()
            .map(|active| active.is_some())
            .unwrap_or(false)
    }

    fn finish(&self, job_id: &str) {
        if let Ok(mut active) = self.active.lock() {
            if active.as_ref().map(|active| active.job_id.as_str()) == Some(job_id) {
                *active = None;
            }
        }
    }
}

impl Drop for JobGuard<'_> {
    fn drop(&mut self) {
        self.manager.finish(&self.job_id);
    }
}

impl JobGuard<'_> {
    pub fn job_id(&self) -> &str {
        &self.job_id
    }

    pub fn action(&self) -> &str {
        &self.action
    }

    pub fn cancel_flag(&self) -> Arc<AtomicBool> {
        Arc::clone(&self.cancelled)
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Relaxed)
    }
}

pub fn emit_started(app: &AppHandle, job: &JobGuard<'_>, step: &str, message: &str, progress: u8) {
    emit(
        app,
        JOB_STARTED,
        job.job_id(),
        job.action(),
        step,
        message,
        clamp_running_progress(progress),
        "info",
    );
}

pub fn emit_progress(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
) {
    emit(
        app,
        JOB_PROGRESS,
        job_id,
        action,
        step,
        message,
        clamp_running_progress(progress),
        "info",
    );
}

pub fn emit_log(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
    level: &str,
) {
    emit(app, JOB_LOG, job_id, action, step, message, progress, level);
}

pub fn emit_error(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
) {
    emit(
        app, JOB_ERROR, job_id, action, step, message, progress, "error",
    );
}

pub fn emit_finalizing_progress(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
) {
    emit(
        app,
        JOB_PROGRESS,
        job_id,
        action,
        step,
        message,
        clamp_finalizing_progress(progress),
        "info",
    );
}

pub fn finish_job_success(app: &AppHandle, job_id: &str, action: &str, step: &str, message: &str) {
    emit_finished(app, job_id, action, step, message, 100, "success");
}

pub fn finish_job_error(app: &AppHandle, job_id: &str, action: &str, step: &str, message: &str) {
    emit_finished(app, job_id, action, step, message, 100, "error");
}

pub fn finish_job_cancelled_at(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    progress: u8,
) {
    emit_finished(
        app,
        job_id,
        action,
        step,
        "Cancelado pelo usuário.",
        clamp_cancelled_progress(progress),
        "cancelled",
    );
}

pub fn clamp_running_progress(progress: u8) -> u8 {
    progress.min(RUNNING_PROGRESS_MAX)
}

pub fn clamp_finalizing_progress(progress: u8) -> u8 {
    progress.clamp(96, 99)
}

pub fn clamp_cancelled_progress(progress: u8) -> u8 {
    progress.min(RUNNING_PROGRESS_MAX)
}

pub fn emit_finished(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
    level: &str,
) {
    emit(
        app,
        JOB_FINISHED,
        job_id,
        action,
        step,
        message,
        progress,
        level,
    );
}

fn emit(
    app: &AppHandle,
    event: &str,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
    level: &str,
) {
    emit_with_steps(
        app,
        event,
        job_id,
        action,
        step,
        message,
        progress,
        level,
        None,
        Vec::new(),
        None,
        None,
    );
}

pub fn emit_started_with_steps(
    app: &AppHandle,
    job: &JobGuard<'_>,
    step: &str,
    message: &str,
    progress: u8,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
) {
    emit_with_steps(
        app,
        JOB_STARTED,
        job.job_id(),
        job.action(),
        step,
        message,
        clamp_running_progress(progress),
        "info",
        current_step_id,
        steps,
        None,
        None,
    );
}

pub fn emit_progress_with_steps(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
) {
    emit_with_steps(
        app,
        JOB_PROGRESS,
        job_id,
        action,
        step,
        message,
        clamp_running_progress(progress),
        "info",
        current_step_id,
        steps,
        None,
        None,
    );
}

pub fn emit_transfer_progress(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
    transfer: TransferProgress,
) {
    let status = event_status(JOB_PROGRESS, "info").to_string();
    let payload = LauncherJobEvent {
        job_id: job_id.to_string(),
        action: action.to_string(),
        step: step.to_string(),
        message: message.to_string(),
        progress: clamp_running_progress(progress),
        level: "info".to_string(),
        status,
        current_step_id: current_step_id.map(str::to_string),
        steps,
        error_kind: None,
        transferred_bytes: transfer.transferred_bytes,
        total_bytes: transfer.total_bytes,
        files_processed: transfer.files_processed,
        total_files: transfer.total_files,
        bytes_per_second: transfer.bytes_per_second,
        elapsed_seconds: transfer.elapsed_seconds,
    };
    let _ = app.emit(JOB_PROGRESS, payload);
}

pub struct TransferProgress {
    pub transferred_bytes: Option<u64>,
    pub total_bytes: Option<u64>,
    pub files_processed: Option<u64>,
    pub total_files: Option<u64>,
    pub bytes_per_second: Option<u64>,
    pub elapsed_seconds: Option<u64>,
}

pub fn emit_finalizing_progress_with_steps(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
) {
    emit_with_steps(
        app,
        JOB_PROGRESS,
        job_id,
        action,
        step,
        message,
        clamp_finalizing_progress(progress),
        "info",
        current_step_id,
        steps,
        None,
        None,
    );
}

pub fn emit_error_with_steps(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
) {
    emit_with_steps(
        app,
        JOB_ERROR,
        job_id,
        action,
        step,
        message,
        progress,
        "error",
        current_step_id,
        steps,
        None,
        None,
    );
}

pub fn finish_job_success_with_steps(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
) {
    emit_with_steps(
        app,
        JOB_FINISHED,
        job_id,
        action,
        step,
        message,
        100,
        "success",
        current_step_id,
        steps,
        None,
        None,
    );
}

pub fn finish_job_error_with_steps(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
    error_kind: Option<&str>,
) {
    emit_with_steps(
        app,
        JOB_FINISHED,
        job_id,
        action,
        step,
        message,
        100,
        "error",
        current_step_id,
        steps,
        error_kind,
        None,
    );
}

pub fn finish_job_cancelled_with_steps(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    progress: u8,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
) {
    emit_with_steps(
        app,
        JOB_FINISHED,
        job_id,
        action,
        step,
        "Operação cancelada. Nenhuma instalação existente foi alterada.",
        clamp_cancelled_progress(progress),
        "cancelled",
        current_step_id,
        steps,
        Some("cancelled_by_user"),
        None,
    );
}

#[allow(clippy::too_many_arguments)]
fn emit_with_steps(
    app: &AppHandle,
    event: &str,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
    level: &str,
    current_step_id: Option<&str>,
    steps: Vec<LauncherStep>,
    error_kind: Option<&str>,
    transfer: Option<&TransferProgress>,
) {
    let payload = LauncherJobEvent {
        job_id: job_id.to_string(),
        action: action.to_string(),
        step: step.to_string(),
        message: message.to_string(),
        progress,
        level: level.to_string(),
        status: event_status(event, level).to_string(),
        current_step_id: current_step_id.map(str::to_string),
        steps,
        error_kind: error_kind.map(str::to_string),
        transferred_bytes: transfer.and_then(|t| t.transferred_bytes),
        total_bytes: transfer.and_then(|t| t.total_bytes),
        files_processed: transfer.and_then(|t| t.files_processed),
        total_files: transfer.and_then(|t| t.total_files),
        bytes_per_second: transfer.and_then(|t| t.bytes_per_second),
        elapsed_seconds: transfer.and_then(|t| t.elapsed_seconds),
    };
    let _ = app.emit(event, payload);
}

fn event_status(event: &str, level: &str) -> &'static str {
    if event == JOB_FINISHED {
        return match level {
            "error" => "error",
            "cancelled" => "cancelled",
            _ => "success",
        };
    }
    if event == JOB_ERROR {
        "error"
    } else {
        "running"
    }
}

fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn job_manager_releases_active_job_when_guard_drops() {
        let manager = JobManager::default();
        {
            let _job = manager.start("Teste").expect("job deve iniciar");
            assert!(manager.has_active_job());
        }

        assert!(!manager.has_active_job());
    }

    #[test]
    fn cancel_active_marks_current_job() {
        let manager = JobManager::default();
        let job = manager.start("Teste").expect("job deve iniciar");

        let cancelled_id = manager
            .cancel_active()
            .expect("cancelamento deve retornar")
            .expect("job ativo deve existir");

        assert_eq!(cancelled_id, job.job_id());
        assert!(job.is_cancelled());
    }

    #[test]
    fn cancelled_progress_never_becomes_success_progress() {
        assert_eq!(clamp_cancelled_progress(42), 42);
        assert_eq!(clamp_cancelled_progress(100), RUNNING_PROGRESS_MAX);
    }
}
