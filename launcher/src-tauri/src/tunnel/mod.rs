pub mod download;
pub mod process;
pub mod state;
pub mod types;
pub mod validation;

use crate::errors::LauncherResult;

pub use types::TunnelState;

pub fn status() -> TunnelState {
    process::current_state()
}

pub fn start(local_url: String) -> LauncherResult<TunnelState> {
    process::start(local_url)
}

pub fn stop() -> LauncherResult<TunnelState> {
    process::stop_active()?;
    Ok(TunnelState::inactive())
}

pub fn cleanup_stale_state() {
    process::cleanup_stale_state();
}

pub fn read_log_text() -> String {
    process::log_text()
}
