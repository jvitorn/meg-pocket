use std::{fmt, io};

use serde::{Deserialize, Serialize};

pub type LauncherResult<T> = Result<T, LauncherError>;

pub const INSTALLERS_LOCKED_FRIENDLY: &str = "Não foi possível preparar os scripts do launcher.\n\nO Windows informou que um arquivo ainda está em uso. Feche outras janelas do launcher, aguarde alguns segundos e tente novamente.";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LauncherErrorKind {
    CancelledByUser,
    Timeout,
    Download,
    Integrity,
    Extraction,
    Validation,
    Installation,
    Database,
    Prisma,
    Next,
    Nginx,
    HealthCheck,
    FileLocked,
    PortUnavailable,
    Unknown,
}

impl LauncherErrorKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::CancelledByUser => "cancelled_by_user",
            Self::Timeout => "timeout",
            Self::Download => "download",
            Self::Integrity => "integrity",
            Self::Extraction => "extraction",
            Self::Validation => "validation",
            Self::Installation => "installation",
            Self::Database => "database",
            Self::Prisma => "prisma",
            Self::Next => "next",
            Self::Nginx => "nginx",
            Self::HealthCheck => "health_check",
            Self::FileLocked => "file_locked",
            Self::PortUnavailable => "port_unavailable",
            Self::Unknown => "unknown",
        }
    }
}

impl Default for LauncherErrorKind {
    fn default() -> Self {
        Self::Unknown
    }
}

#[derive(Debug, Clone)]
pub struct LauncherError {
    pub kind: LauncherErrorKind,
    friendly: String,
    technical: String,
}

impl LauncherError {
    pub fn new(friendly: impl Into<String>, technical: impl Into<String>) -> Self {
        Self::with_kind(LauncherErrorKind::Unknown, friendly, technical)
    }

    pub fn with_kind(
        kind: LauncherErrorKind,
        friendly: impl Into<String>,
        technical: impl Into<String>,
    ) -> Self {
        let friendly = friendly.into();
        let technical = technical.into();
        Self {
            kind,
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

    pub fn cancelled(message: impl Into<String>) -> Self {
        let message = message.into();
        Self::with_kind(LauncherErrorKind::CancelledByUser, message.clone(), message)
    }

    pub fn timeout(friendly: impl Into<String>, technical: impl Into<String>) -> Self {
        Self::with_kind(LauncherErrorKind::Timeout, friendly, technical)
    }

    pub fn download(friendly: impl Into<String>, technical: impl Into<String>) -> Self {
        Self::with_kind(LauncherErrorKind::Download, friendly, technical)
    }

    pub fn extraction(friendly: impl Into<String>, technical: impl Into<String>) -> Self {
        Self::with_kind(LauncherErrorKind::Extraction, friendly, technical)
    }

    pub fn integrity(friendly: impl Into<String>, technical: impl Into<String>) -> Self {
        Self::with_kind(LauncherErrorKind::Integrity, friendly, technical)
    }

    pub fn installation(friendly: impl Into<String>, technical: impl Into<String>) -> Self {
        Self::with_kind(LauncherErrorKind::Installation, friendly, technical)
    }

    pub fn installers_locked(technical: impl Into<String>) -> Self {
        Self::with_kind(
            LauncherErrorKind::FileLocked,
            INSTALLERS_LOCKED_FRIENDLY,
            technical,
        )
    }

    pub fn friendly_message(&self) -> &str {
        &self.friendly
    }

    pub fn technical_message(&self) -> &str {
        &self.technical
    }

    pub fn kind_str(&self) -> &'static str {
        self.kind.as_str()
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
        LauncherError::new(
            "Não foi possível preparar os scripts do launcher.",
            technical,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cancelled_error_has_correct_kind() {
        let err = LauncherError::cancelled("Operação cancelada.");
        assert_eq!(err.kind, LauncherErrorKind::CancelledByUser);
        assert_eq!(err.kind_str(), "cancelled_by_user");
    }

    #[test]
    fn timeout_error_has_correct_kind() {
        let err = LauncherError::timeout("Demorou demais.", "detalhes técnicos");
        assert_eq!(err.kind, LauncherErrorKind::Timeout);
        assert_eq!(err.kind_str(), "timeout");
        assert!(!err
            .friendly_message()
            .to_ascii_lowercase()
            .contains("cancelad"));
    }

    #[test]
    fn timeout_and_cancelled_are_different_kinds() {
        let timeout = LauncherError::timeout("Demorou.", "detalhe");
        let cancelled = LauncherError::cancelled("Cancelado.");
        assert_ne!(timeout.kind, cancelled.kind);
    }
}
