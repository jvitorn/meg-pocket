use std::{
    fs,
    process::{Command, Stdio},
    time::Duration,
};

use serde_json::json;

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    runtime::types::RuntimeMode,
    scripts,
};

const DOCKER_TIMEOUT: Duration = Duration::from_secs(3);

pub fn detect_runtime_mode() -> RuntimeMode {
    if cfg!(target_os = "linux") {
        return RuntimeMode::Docker;
    }

    if cfg!(target_os = "windows") {
        if docker_healthy() {
            RuntimeMode::Docker
        } else {
            RuntimeMode::Portable
        }
    } else {
        RuntimeMode::Docker
    }
}

pub fn persist_runtime_mode(mode: RuntimeMode) -> LauncherResult<()> {
    let config_dir = paths::mg_pocket_config_dir()?;
    fs::create_dir_all(&config_dir).map_err(|error| {
        LauncherError::technical("Não foi possível criar pasta de configuração", error)
    })?;
    let path = config_dir.join("runtime.json");
    let mut value = fs::read_to_string(&path)
        .ok()
        .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
        .filter(|value| value.is_object())
        .unwrap_or_else(|| json!({}));
    if let Some(object) = value.as_object_mut() {
        object.insert("runtimeMode".to_string(), json!(mode.as_str()));
        object.insert("updatedAt".to_string(), json!(unix_timestamp_string()));
    }
    fs::write(
        path,
        serde_json::to_string_pretty(&value).unwrap_or_else(|_| "{}".to_string()),
    )
    .map_err(|error| LauncherError::technical("Não foi possível salvar runtime.json", error))
}

fn docker_healthy() -> bool {
    if !command_success("docker", &["--version"], DOCKER_TIMEOUT) {
        return false;
    }
    command_success("docker", &["info"], DOCKER_TIMEOUT)
        && command_success("docker", &["compose", "version"], DOCKER_TIMEOUT)
}

fn command_success(program: &str, args: &[&str], timeout: Duration) -> bool {
    let mut command = Command::new(program);
    scripts::prepare_child_command(&mut command);
    let mut child = match command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(child) => child,
        Err(_) => return false,
    };

    let started = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => return status.success(),
            Ok(None) => {}
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return false;
            }
        }

        if started.elapsed() >= timeout {
            let _ = child.kill();
            let _ = child.wait();
            return false;
        }

        std::thread::sleep(Duration::from_millis(40));
    }
}

fn unix_timestamp_string() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}
