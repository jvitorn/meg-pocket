use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TunnelState {
    pub status: String,
    pub public_url: Option<String>,
    pub local_url: Option<String>,
    pub pid: Option<u32>,
    pub executable_path: Option<String>,
    pub executable_sha256: Option<String>,
    pub version: Option<String>,
    pub message: Option<String>,
    pub started_at: Option<String>,
    pub updated_at: String,
}

impl TunnelState {
    pub fn inactive() -> Self {
        Self {
            status: "inactive".to_string(),
            public_url: None,
            local_url: None,
            pid: None,
            executable_path: None,
            executable_sha256: None,
            version: None,
            message: None,
            started_at: None,
            updated_at: unix_timestamp_string(),
        }
    }

    pub fn preparing(local_url: String, pid: u32, binary: &InstalledCloudflared) -> Self {
        Self {
            status: "preparing".to_string(),
            public_url: None,
            local_url: Some(local_url),
            pid: Some(pid),
            executable_path: Some(binary.path.to_string_lossy().to_string()),
            executable_sha256: Some(binary.sha256.clone()),
            version: Some(binary.version.clone()),
            message: Some("Criando link temporário...".to_string()),
            started_at: Some(unix_timestamp_string()),
            updated_at: unix_timestamp_string(),
        }
    }

    pub fn active(mut self, public_url: String) -> Self {
        self.status = "active".to_string();
        self.public_url = Some(public_url);
        self.message = Some("Compartilhamento ativo.".to_string());
        self.updated_at = unix_timestamp_string();
        self
    }
}

#[derive(Clone, Debug)]
pub struct InstalledCloudflared {
    pub path: PathBuf,
    pub version: String,
    pub sha256: String,
}

pub fn unix_timestamp_string() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}
