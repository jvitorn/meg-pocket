use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortableManifest {
    pub version: String,
    pub runtime_version: String,
    pub windows: ManifestWindows,
}

#[derive(Debug, Deserialize)]
pub struct ManifestWindows {
    pub x64: ManifestAsset,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestAsset {
    pub file: String,
    pub url: String,
    pub sha256: String,
    pub size_bytes: Option<u64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortableRuntimeConfig {
    pub runtime_mode: String,
    pub version: String,
    pub runtime_version: String,
    pub public_port: u16,
    pub next_port: u16,
    pub postgres_port: u16,
    pub app_url: String,
    pub installed_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessRegistry {
    pub runtime_mode: String,
    pub nginx: Option<ProcessInfo>,
    pub next: Option<ProcessInfo>,
    pub postgres: Option<ProcessInfo>,
    pub started_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub pid: u32,
    pub port: u16,
}

impl ProcessRegistry {
    pub fn empty() -> Self {
        Self {
            runtime_mode: "portable".to_string(),
            nginx: None,
            next: None,
            postgres: None,
            started_at: unix_timestamp_string(),
        }
    }
}

pub fn unix_timestamp_string() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}
