#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

read_detect_value() {
  local key="$1"
  local text="$2"
  printf '%s\n' "$text" | sed -n "s/^$key=//p" | head -n 1
}

bool() {
  if "$@"; then
    printf '%s' "true"
  else
    printf '%s' "false"
  fi
}

detect_output="$("$SCRIPT_DIR/detect-distro.sh")"
distro_family="$(read_detect_value family "$detect_output")"
distro_id="$(read_detect_value id "$detect_output")"
distro_name="$(read_detect_value pretty_name "$detect_output")"
supported="$(read_detect_value supported "$detect_output")"

docker_installed=false
docker_version=""
docker_running=false
docker_permission_ok=false
sudo_docker_works=false
docker_compose_installed=false
docker_compose_version=""
requires_relogin=false

if has_command docker; then
  docker_installed=true
  docker_version="$(docker --version 2>/dev/null || true)"

  if has_command systemctl && systemctl is-active --quiet docker 2>/dev/null; then
    docker_running=true
  fi

  if docker_info_works; then
    docker_running=true
    docker_permission_ok=true
  elif sudo_docker_info_works_no_prompt; then
    docker_running=true
    sudo_docker_works=true
    requires_relogin=true
  fi
fi

if cmd="$(run_compose_no_prompt_cmd 2>/dev/null)"; then
  docker_compose_installed=true
  read -r -a compose_parts <<< "$cmd"
  docker_compose_version="$("${compose_parts[@]}" version 2>/dev/null | head -n 1 || true)"
fi

project_path="$(project_dir)"
compose_file_exists=false
project_installed=false
project_version_value=""

if [ -f "$project_path/docker-compose.yml" ]; then
  compose_file_exists=true
  project_installed=true
  project_version_value="$(project_version "$project_path")"
fi

app_online="$(bool http_ok "http://localhost:3000")"
adminer_online="$(bool http_ok "http://localhost:8081")"

cat <<JSON
{
  "os": "linux",
  "distroFamily": "$(json_escape "$distro_family")",
  "distroId": "$(json_escape "$distro_id")",
  "distroName": "$(json_escape "$distro_name")",
  "supported": $supported,
  "dockerInstalled": $docker_installed,
  "dockerVersion": "$(json_escape "$docker_version")",
  "dockerRunning": $docker_running,
  "dockerComposeInstalled": $docker_compose_installed,
  "dockerComposeVersion": "$(json_escape "$docker_compose_version")",
  "dockerPermissionOk": $docker_permission_ok,
  "sudoDockerWorks": $sudo_docker_works,
  "requiresRelogin": $requires_relogin,
  "projectInstalled": $project_installed,
  "projectPath": "$(json_escape "$project_path")",
  "projectVersion": "$(json_escape "$project_version_value")",
  "composeFileExists": $compose_file_exists,
  "appOnline": $app_online,
  "adminerOnline": $adminer_online
}
JSON
