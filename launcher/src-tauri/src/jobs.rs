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
pub struct LauncherJobEvent {
    pub job_id: String,
    pub action: String,
    pub step: String,
    pub message: String,
    pub progress: u8,
    pub level: String,
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

pub fn finish_job_success(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
) {
    emit_finished(app, job_id, action, step, message, 100, "success");
}

pub fn finish_job_error(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
) {
    emit_finished(app, job_id, action, step, message, 100, "error");
}

pub fn finish_job_cancelled(app: &AppHandle, job_id: &str, action: &str, step: &str) {
    emit_finished(
        app,
        job_id,
        action,
        step,
        "Operação cancelada.",
        100,
        "cancelled",
    );
}

pub fn clamp_running_progress(progress: u8) -> u8 {
    progress.min(RUNNING_PROGRESS_MAX)
}

pub fn clamp_finalizing_progress(progress: u8) -> u8 {
    progress.clamp(96, 99)
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
    let payload = LauncherJobEvent {
        job_id: job_id.to_string(),
        action: action.to_string(),
        step: step.to_string(),
        message: message.to_string(),
        progress,
        level: level.to_string(),
    };
    let _ = app.emit(event, payload);
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
}
