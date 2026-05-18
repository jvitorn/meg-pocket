use std::{fmt, io};

pub type LauncherResult<T> = Result<T, LauncherError>;

pub const INSTALLERS_LOCKED_FRIENDLY: &str = "Não foi possível preparar os scripts do launcher.\n\nO Windows informou que um arquivo ainda está em uso. Feche outras janelas do launcher, aguarde alguns segundos e tente novamente.";

#[derive(Debug, Clone)]
pub struct LauncherError {
    friendly: String,
    technical: String,
}

impl LauncherError {
    pub fn new(friendly: impl Into<String>, technical: impl Into<String>) -> Self {
        let friendly = friendly.into();
        let technical = technical.into();

        Self {
            technical: if technical.trim().is_empty() {
                friendly.clone()
            } else {
                technical
            },
            friendly,
        }
    }

    pub fn friendly(message: impl Into<String>) -> Self {
        let message = message.into();
        Self::new(message.clone(), message)
    }

    pub fn technical(context: impl Into<String>, error: impl fmt::Display) -> Self {
        let context = context.into();
        Self::new(context.clone(), format!("{context}: {error}"))
    }

    pub fn installers_locked(technical: impl Into<String>) -> Self {
        Self::new(INSTALLERS_LOCKED_FRIENDLY, technical)
    }

    pub fn friendly_message(&self) -> &str {
        &self.friendly
    }

    pub fn technical_message(&self) -> &str {
        &self.technical
    }
}

impl fmt::Display for LauncherError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.friendly)
    }
}

impl std::error::Error for LauncherError {}

pub fn is_windows_file_lock(error: &io::Error) -> bool {
    error.raw_os_error() == Some(32)
        || error
            .to_string()
            .to_ascii_lowercase()
            .contains("being used by another process")
}

pub fn installers_io_error(action: &str, error: io::Error) -> LauncherError {
    let technical = format!("{action}: {error}");

    if is_windows_file_lock(&error) {
        LauncherError::installers_locked(technical)
    } else {
        LauncherError::new("Não foi possível preparar os scripts do launcher.", technical)
    }
}
