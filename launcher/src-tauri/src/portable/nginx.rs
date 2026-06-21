use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::types::PortableRuntimeConfig,
    scripts,
};

const LOG_LIMIT_BYTES: usize = 128 * 1024;

pub fn write_config(config: &PortableRuntimeConfig) -> LauncherResult<()> {
    let runtime_dir = paths::mg_pocket_runtime_dir()?;
    let nginx_dir = runtime_dir.join("nginx");
    for dir in [
        nginx_dir.join("conf"),
        nginx_dir.join("logs"),
        nginx_dir.join("temp"),
    ] {
        fs::create_dir_all(&dir).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta do Nginx portátil", error)
        })?;
    }

    let content = render_config(
        config,
        &runtime_dir,
        &paths::mg_pocket_logs_dir()?,
        &paths::mg_pocket_data_content_dir()?.join("uploads"),
    );

    fs::write(paths::mg_pocket_config_dir()?.join("nginx.conf"), content)
        .map_err(|error| LauncherError::technical("Não foi possível gravar nginx.conf", error))
}

pub fn test_config() -> LauncherResult<()> {
    append_launcher_log(&format!(
        "\n=== nginx -t {} ===\n",
        super::types::unix_timestamp_string()
    ))?;

    let mut command = nginx_base_command()?;
    command.arg("-t");
    scripts::prepare_child_command(&mut command);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let display = format!("{command:?}");
    let output = command.output().map_err(|error| {
        nginx_error_with_logs(
            "Não foi possível validar a configuração do Nginx portátil.",
            format!("Falha ao executar {display}: {error}"),
        )
    })?;

    append_launcher_log(&format!(
        "comando: {display}\nexit code: {}\nstdout:\n{}\nstderr:\n{}\n",
        output
            .status
            .code()
            .map(|code| code.to_string())
            .unwrap_or_else(|| "indisponível".to_string()),
        non_empty_log_text(&String::from_utf8_lossy(&output.stdout)),
        non_empty_log_text(&String::from_utf8_lossy(&output.stderr)),
    ))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(nginx_error_with_logs(
            "A configuração do Nginx portátil é inválida.",
            format!("nginx.exe -t falhou: {display}"),
        ))
    }
}

pub fn start_command() -> LauncherResult<Command> {
    nginx_base_command()
}

pub fn launcher_log_path() -> LauncherResult<PathBuf> {
    Ok(paths::mg_pocket_logs_dir()?.join("nginx-launcher.log"))
}

pub fn error_log_path() -> LauncherResult<PathBuf> {
    Ok(paths::mg_pocket_logs_dir()?.join("nginx-error.log"))
}

pub fn append_launcher_log(content: &str) -> LauncherResult<()> {
    let path = launcher_log_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de logs", error)
        })?;
    }
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .and_then(|mut file| std::io::Write::write_all(&mut file, content.as_bytes()))
        .map_err(|error| {
            LauncherError::technical("Não foi possível gravar nginx-launcher.log", error)
        })
}

pub fn open_launcher_log() -> LauncherResult<fs::File> {
    let path = launcher_log_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta de logs", error)
        })?;
    }
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|error| {
            LauncherError::technical("Não foi possível abrir nginx-launcher.log", error)
        })
}

pub fn nginx_error_with_logs(
    friendly: impl Into<String>,
    technical: impl Into<String>,
) -> LauncherError {
    let launcher_log = launcher_log_path()
        .ok()
        .map(|path| log_section(&path))
        .unwrap_or_else(|| "nginx-launcher.log indisponível.".to_string());
    let error_log = error_log_path()
        .ok()
        .map(|path| log_section(&path))
        .unwrap_or_else(|| "nginx-error.log indisponível.".to_string());

    LauncherError::new(
        friendly,
        format!("{}\n\n{}\n\n{}", technical.into(), launcher_log, error_log),
    )
}

fn nginx_base_command() -> LauncherResult<Command> {
    let runtime_nginx_dir = paths::mg_pocket_runtime_dir()?.join("nginx");
    let mut command = Command::new(runtime_nginx_dir.join("nginx.exe"));
    command
        .arg("-c")
        .arg(paths::mg_pocket_config_dir()?.join("nginx.conf"));
    command.arg("-p").arg(&runtime_nginx_dir);
    command.current_dir(runtime_nginx_dir);
    Ok(command)
}

fn render_config(
    config: &PortableRuntimeConfig,
    runtime_dir: &Path,
    logs_dir: &Path,
    uploads_dir: &Path,
) -> String {
    let mime_types = runtime_dir.join("nginx").join("conf").join("mime.types");
    let error_log = logs_dir.join("nginx-error.log");
    let access_log = logs_dir.join("nginx-access.log");
    let pid = logs_dir.join("nginx.pid");
    let uploads_alias = nginx_dir_with_trailing_slash(uploads_dir);

    format!(
        r#"worker_processes  1;
error_log  {error_log};
pid        {pid};

events {{
    worker_connections  256;
}}

http {{
    access_log {access_log};
    include       {mime_types};
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout  65;

    server {{
        listen 127.0.0.1:{public_port};
        server_name localhost 127.0.0.1;

        location = /healthz {{
            return 200 "ok\n";
        }}

        location ^~ /uploads/ {{
            alias {uploads_alias};
            try_files $uri =404;
        }}

        location / {{
            proxy_pass http://127.0.0.1:{next_port};
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto http;
        }}
    }}
}}
"#,
        error_log = nginx_quote_path(&error_log),
        pid = nginx_quote_path(&pid),
        access_log = nginx_quote_path(&access_log),
        mime_types = nginx_quote_path(&mime_types),
        public_port = config.public_port,
        next_port = config.next_port,
        uploads_alias = nginx_quote_raw_path(&uploads_alias),
    )
}

fn nginx_dir_with_trailing_slash(path: &Path) -> String {
    let normalized = nginx_path(path);
    format!("{}/", normalized.trim_end_matches('/'))
}

fn nginx_quote_path(path: &Path) -> String {
    nginx_quote_raw_path(&nginx_path(path))
}

fn nginx_quote_raw_path(path: &str) -> String {
    format!("\"{}\"", path.replace('"', "\\\""))
}

fn nginx_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn non_empty_log_text(text: &str) -> &str {
    if text.trim().is_empty() {
        "(vazio)"
    } else {
        text.trim_end()
    }
}

fn log_section(path: &Path) -> String {
    let text = fs::read_to_string(path)
        .ok()
        .filter(|text| !text.trim().is_empty())
        .map(|text| tail_bytes(&text, LOG_LIMIT_BYTES).to_string())
        .unwrap_or_else(|| "(vazio ou indisponível)".to_string());
    format!("Conteúdo de {}:\n{}", path.display(), text)
}

fn tail_bytes(text: &str, limit: usize) -> &str {
    if text.len() <= limit {
        text
    } else {
        text.get(text.len().saturating_sub(limit)..).unwrap_or(text)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn runtime_config() -> PortableRuntimeConfig {
        PortableRuntimeConfig {
            runtime_mode: "portable".to_string(),
            version: "v1.1.0".to_string(),
            runtime_version: "portable-runtime-v1.1.0".to_string(),
            public_port: 3000,
            next_port: 3001,
            postgres_port: 54321,
            app_url: "http://localhost:3000".to_string(),
            installed_at: "0".to_string(),
        }
    }

    #[test]
    fn nginx_config_quotes_paths_with_spaces() {
        let content = render_config(
            &runtime_config(),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\runtime"),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\logs"),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\data\uploads"),
        );

        assert!(content.contains(
            r#"error_log  "C:/Users/Player/AppData/Local/MG Pocket/logs/nginx-error.log";"#
        ));
        assert!(content.contains(
            r#"access_log "C:/Users/Player/AppData/Local/MG Pocket/logs/nginx-access.log";"#
        ));
        assert!(content
            .contains(r#"pid        "C:/Users/Player/AppData/Local/MG Pocket/logs/nginx.pid";"#));
        assert!(
            content.contains(r#"alias "C:/Users/Player/AppData/Local/MG Pocket/data/uploads/";"#)
        );
    }

    #[test]
    fn nginx_config_uses_absolute_mime_types_path() {
        let content = render_config(
            &runtime_config(),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\runtime"),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\logs"),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\data\uploads"),
        );

        assert!(content.contains(
            r#"include       "C:/Users/Player/AppData/Local/MG Pocket/runtime/nginx/conf/mime.types";"#
        ));
        assert!(!content.contains("include       mime.types;"));
    }

    #[test]
    fn nginx_config_binds_to_localhost_only() {
        let content = render_config(
            &runtime_config(),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\runtime"),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\logs"),
            Path::new(r"C:\Users\Player\AppData\Local\MG Pocket\data\uploads"),
        );

        assert!(
            content.contains("listen 127.0.0.1:3000;"),
            "nginx deve escutar somente em 127.0.0.1"
        );
        assert!(
            !content.contains("listen 3000;"),
            "nginx não deve escutar em todas as interfaces"
        );
        assert!(
            content.contains("server_name localhost 127.0.0.1;"),
            "server_name deve incluir 127.0.0.1"
        );
    }
}
