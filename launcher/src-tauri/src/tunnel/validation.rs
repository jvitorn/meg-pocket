use std::{
    io::{Read, Write},
    net::{TcpStream, ToSocketAddrs},
    time::Duration,
};

use crate::{
    errors::{LauncherError, LauncherResult},
    tunnel::types::TunnelState,
};

pub fn normalize_local_url(url: &str) -> LauncherResult<String> {
    let trimmed = url.trim().trim_end_matches('/');
    let Some(rest) = trimmed.strip_prefix("http://") else {
        return Err(LauncherError::friendly(
            "Não foi possível preparar o compartilhamento: URL local inválida.",
        ));
    };
    let host_port = rest.split('/').next().unwrap_or_default();
    let mut parts = host_port.rsplitn(2, ':');
    let port_text = parts.next().unwrap_or_default();
    let host = parts.next().unwrap_or_default();
    if host != "localhost" && host != "127.0.0.1" {
        return Err(LauncherError::friendly(
            "Não foi possível preparar o compartilhamento: endereço local não permitido.",
        ));
    }
    let port = port_text.parse::<u16>().map_err(|_| {
        LauncherError::friendly(
            "Não foi possível preparar o compartilhamento: porta local inválida.",
        )
    })?;
    Ok(format!("http://127.0.0.1:{port}"))
}

pub fn validate_public_url(url: &str) -> LauncherResult<String> {
    let trimmed = url
        .trim()
        .trim_matches(|ch: char| matches!(ch, '"' | '\'' | ')' | '(' | '[' | ']' | ',' | ';'))
        .trim_end_matches('/');
    let Some(rest) = trimmed.strip_prefix("https://") else {
        return Err(LauncherError::friendly("Link temporário inválido."));
    };
    let host = rest.split('/').next().unwrap_or_default();
    if !host.ends_with(".trycloudflare.com") || host == ".trycloudflare.com" {
        return Err(LauncherError::friendly("Link temporário inválido."));
    }
    if !host
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '.')
    {
        return Err(LauncherError::friendly("Link temporário inválido."));
    }
    Ok(format!("https://{host}"))
}

pub fn extract_trycloudflare_url(line: &str) -> Option<String> {
    line.split_whitespace()
        .filter(|part| part.contains("trycloudflare.com"))
        .find_map(|part| validate_public_url(part).ok())
}

pub fn local_url_is_online(local_url: &str, timeout: Duration) -> bool {
    let Some(port) = local_url_port(local_url) else {
        return false;
    };
    check_http_path(port, "/api/health", timeout) || check_http_path(port, "/healthz", timeout)
}

fn local_url_port(local_url: &str) -> Option<u16> {
    local_url
        .strip_prefix("http://127.0.0.1:")
        .and_then(|rest| rest.split('/').next())
        .and_then(|port| port.parse::<u16>().ok())
}

fn check_http_path(port: u16, path: &str, timeout: Duration) -> bool {
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

pub fn state_has_required_ownership_fields(state: &TunnelState) -> bool {
    state.pid.unwrap_or_default() > 0
        && state
            .executable_path
            .as_deref()
            .map(|path| path.contains("cloudflared"))
            .unwrap_or(false)
        && state
            .local_url
            .as_deref()
            .map(|url| normalize_local_url(url).is_ok())
            .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_trycloudflare_https_url() {
        assert_eq!(
            validate_public_url("https://abc-123.trycloudflare.com/").unwrap(),
            "https://abc-123.trycloudflare.com"
        );
    }

    #[test]
    fn rejects_non_trycloudflare_public_url() {
        assert!(validate_public_url("https://example.com").is_err());
        assert!(validate_public_url("http://abc.trycloudflare.com").is_err());
    }

    #[test]
    fn normalizes_localhost_to_loopback() {
        assert_eq!(
            normalize_local_url("http://localhost:3000/").unwrap(),
            "http://127.0.0.1:3000"
        );
    }
}
