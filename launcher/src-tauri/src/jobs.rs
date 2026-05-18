use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
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
    active: Mutex<Option<String>>,
    counter: AtomicU64,
}

pub struct JobGuard<'a> {
    manager: &'a JobManager,
    job_id: String,
    action: String,
}

impl JobManager {
    pub fn start(&self, action: &str) -> LauncherResult<JobGuard<'_>> {
        let mut active = self
            .active
            .lock()
            .map_err(|_| LauncherError::friendly("O controle de jobs do launcher ficou indisponível."))?;

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
        *active = Some(job_id.clone());

        Ok(JobGuard {
            manager: self,
            job_id,
            action: action.to_string(),
        })
    }

    fn finish(&self, job_id: &str) {
        if let Ok(mut active) = self.active.lock() {
            if active.as_deref() == Some(job_id) {
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
}

pub fn emit_started(app: &AppHandle, job: &JobGuard<'_>, step: &str, message: &str, progress: u8) {
    emit(app, JOB_STARTED, job.job_id(), job.action(), step, message, progress, "info");
}

pub fn emit_progress(
    app: &AppHandle,
    job_id: &str,
    action: &str,
    step: &str,
    message: &str,
    progress: u8,
) {
    emit(app, JOB_PROGRESS, job_id, action, step, message, progress, "info");
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

pub fn emit_error(app: &AppHandle, job_id: &str, action: &str, step: &str, message: &str, progress: u8) {
    emit(app, JOB_ERROR, job_id, action, step, message, progress, "error");
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
    emit(app, JOB_FINISHED, job_id, action, step, message, progress, level);
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
