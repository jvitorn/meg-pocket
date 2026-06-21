use std::{
    fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    path::PathBuf,
    time::Duration,
};

use serde_json::json;

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::{
        install,
        types::{unix_timestamp_string, PortableRuntimeConfig},
    },
};

const PORT_TIMEOUT: Duration = Duration::from_millis(700);

pub fn is_installed() -> bool {
    required_paths()
        .into_iter()
        .all(|path| install::portable_root().join(path).exists())
}

pub fn validate_installation() -> LauncherResult<()> {
    let missing = required_paths()
        .into_iter()
        .filter(|path| !install::portable_root().join(path).exists())
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>();

    if missing.is_empty() {
        Ok(())
    } else {
        Err(LauncherError::new(
            "A instalação local está incompleta. Use Reparar instalação.",
            format!("Arquivos obrigatórios ausentes:\n{}", missing.join("\n")),
        ))
    }
}

pub fn quick_status_json() -> LauncherResult<String> {
    status_json(false)
}

pub fn full_status_json() -> LauncherResult<String> {
    status_json(true)
}

pub fn read_runtime_config() -> Option<PortableRuntimeConfig> {
    let path = paths::mg_pocket_config_dir().ok()?.join("runtime.json");
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn configured_app_url() -> String {
    read_runtime_config()
        .map(|config| config.app_url)
        .unwrap_or_else(|| "http://localhost:3000".to_string())
}

pub fn required_paths() -> Vec<PathBuf> {
    [
        "runtime/node/node.exe",
        "runtime/postgres/bin/postgres.exe",
        "runtime/postgres/bin/pg_ctl.exe",
        "runtime/postgres/bin/initdb.exe",
        "runtime/postgres/bin/psql.exe",
        "runtime/postgres/bin/pg_dump.exe",
        "runtime/postgres/bin/pg_restore.exe",
        "runtime/postgres/bin/createdb.exe",
        "runtime/nginx/nginx.exe",
        "app/server.js",
        "app/.next",
        "app/public",
        "prisma/schema.prisma",
        "prisma/prisma.config.mjs",
        "prisma/migrations",
        "prisma/seeds/generated/index.sql",
        "scripts/package.json",
        "scripts/package-lock.json",
        "scripts/run-sql-file.mjs",
        "scripts/lib/run-sql-file.mjs",
        "scripts/portable-db-setup.mjs",
        "scripts/node_modules/pg/package.json",
        "scripts/node_modules/prisma/build/index.js",
    ]
    .into_iter()
    .map(PathBuf::from)
    .collect()
}

fn status_json(full: bool) -> LauncherResult<String> {
    let config = read_runtime_config();
    let public_port = config
        .as_ref()
        .map(|config| config.public_port)
        .unwrap_or(3000);
    let postgres_port = config
        .as_ref()
        .map(|config| config.postgres_port)
        .unwrap_or(54321);
    let app_url = config
        .as_ref()
        .map(|config| config.app_url.clone())
        .unwrap_or_else(|| format!("http://localhost:{public_port}"));
    let installed = is_installed();
    let app_online = installed && check_http_path(public_port, "/api/health", PORT_TIMEOUT);
    let nginx_online = installed && check_http_path(public_port, "/healthz", PORT_TIMEOUT);
    let uploads_served =
        installed && check_http_path(public_port, "/uploads/.meg-pocket-health", PORT_TIMEOUT);
    let database_connected = if full && installed {
        check_http_path(public_port, "/api/health/db", PORT_TIMEOUT)
            || check_local_port(postgres_port, PORT_TIMEOUT)
    } else {
        check_local_port(postgres_port, PORT_TIMEOUT)
    };

    Ok(json!({
        "os": current_os(),
        "supported": cfg!(target_os = "windows"),
        "runtimeMode": "portable",
        "runtimeLabel": "Portátil",
        "wingetInstalled": null,
        "gitInstalled": null,
        "powerShellInstalled": cfg!(target_os = "windows"),
        "wsl2Installed": null,
        "dockerDesktopInstalled": null,
        "dockerInstalled": false,
        "dockerRunning": false,
        "dockerComposeInstalled": false,
        "dockerPermissionOk": false,
        "sudoDockerWorks": false,
        "requiresRelogin": false,
        "projectInstalled": installed,
        "portableInstalled": installed,
        "projectPath": install::portable_root().to_string_lossy(),
        "projectVersion": config.as_ref().map(|config| config.version.clone()).unwrap_or_else(|| "runtime não instalado".to_string()),
        "appUrl": app_url,
        "adminerUrl": null,
        "appOnline": app_online,
        "adminerOnline": false,
        "containerRuntime": "portable",
        "port3000Available": !check_local_port(3000, PORT_TIMEOUT),
        "port80Available": !check_local_port(80, PORT_TIMEOUT),
        "port443Available": !check_local_port(443, PORT_TIMEOUT),
        "port5432Available": !check_local_port(5432, PORT_TIMEOUT),
        "databaseConnected": database_connected,
        "containersActive": false,
        "nginxOnline": nginx_online,
        "uploadsDirectoryOk": paths::mg_pocket_data_content_dir().map(|path| path.join("uploads").is_dir()).unwrap_or(false),
        "uploadsServed": uploads_served,
        "nextAssetsOnline": installed && check_http_path(public_port, "/imgs/icons/logo_guerreiro.svg", PORT_TIMEOUT),
        "localDataPath": paths::mg_pocket_data_content_dir().map(|path| path.to_string_lossy().to_string()).unwrap_or_default(),
        "localBackupsPath": paths::mg_pocket_backups_dir().map(|path| path.to_string_lossy().to_string()).unwrap_or_default(),
        "localLogsPath": paths::mg_pocket_logs_dir().map(|path| path.to_string_lossy().to_string()).unwrap_or_default(),
        "checkedAt": unix_timestamp_string(),
    })
    .to_string())
}

pub fn check_http_path(port: u16, path: &str, timeout: Duration) -> bool {
    let addr = ("127.0.0.1", port)
        .to_socket_addrs()
        .ok()
        .and_then(|mut addrs| addrs.next());
    let Some(addr) = addr else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect_timeout(&addr, timeout) else {
        return false;
    };
    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));
    let request = format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n");
    if stream.write_all(request.as_bytes()).is_err() {
        return false;
    }
    let mut buffer = [0_u8; 64];
    let Ok(bytes) = stream.read(&mut buffer) else {
        return false;
    };
    let response = String::from_utf8_lossy(&buffer[..bytes]);
    response.starts_with("HTTP/1.1 2") || response.starts_with("HTTP/1.0 2")
}

pub fn check_local_port(port: u16, timeout: Duration) -> bool {
    let hosts = [("127.0.0.1", port), ("::1", port)];
    hosts.into_iter().any(|host| {
        host.to_socket_addrs()
            .ok()
            .into_iter()
            .flatten()
            .any(|addr: SocketAddr| TcpStream::connect_timeout(&addr, timeout).is_ok())
    })
}

fn current_os() -> &'static str {
    if cfg!(target_os = "linux") {
        "linux"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "unknown"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn required_paths_include_portable_script_runtime() {
        let paths = required_paths()
            .into_iter()
            .map(|path| path.to_string_lossy().replace('\\', "/"))
            .collect::<Vec<_>>();

        for expected in [
            "scripts/portable-db-setup.mjs",
            "scripts/node_modules/pg/package.json",
            "scripts/node_modules/prisma/build/index.js",
            "prisma/prisma.config.mjs",
            "scripts/package.json",
            "scripts/package-lock.json",
            "scripts/lib/run-sql-file.mjs",
        ] {
            assert!(
                paths.iter().any(|path| path == expected),
                "required_paths missing {expected}"
            );
        }
    }
}
