use std::fs;

use crate::{
    errors::{LauncherError, LauncherResult},
    paths,
    portable::types::PortableRuntimeConfig,
};

pub fn write_config(config: &PortableRuntimeConfig) -> LauncherResult<()> {
    let nginx_dir = paths::mg_pocket_runtime_dir()?.join("nginx");
    for dir in [
        nginx_dir.join("conf"),
        nginx_dir.join("logs"),
        nginx_dir.join("temp"),
    ] {
        fs::create_dir_all(&dir).map_err(|error| {
            LauncherError::technical("Não foi possível criar pasta do Nginx portátil", error)
        })?;
    }

    let uploads = paths::mg_pocket_data_content_dir()?
        .join("uploads")
        .to_string_lossy()
        .replace('\\', "/");
    let logs = paths::mg_pocket_logs_dir()?.to_string_lossy().replace('\\', "/");
    let content = format!(
        r#"worker_processes  1;
error_log  {logs}/nginx-error.log;
pid        {logs}/nginx.pid;

events {{
    worker_connections  256;
}}

http {{
    access_log {logs}/nginx-access.log;
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout  65;

    server {{
        listen {public_port};
        server_name localhost;

        location = /healthz {{
            return 200 "ok\n";
        }}

        location ^~ /uploads/ {{
            alias {uploads}/;
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
        logs = logs,
        public_port = config.public_port,
        next_port = config.next_port,
        uploads = uploads,
    );

    fs::write(paths::mg_pocket_config_dir()?.join("nginx.conf"), content)
        .map_err(|error| LauncherError::technical("Não foi possível gravar nginx.conf", error))
}
