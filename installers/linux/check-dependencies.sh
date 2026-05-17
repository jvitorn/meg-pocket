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

json_string_array() {
  local first=true
  local value

  printf '['
  for value in "$@"; do
    if [ "$first" = true ]; then
      first=false
    else
      printf ', '
    fi
    printf '"%s"' "$(json_escape "$value")"
  done
  printf ']'
}

dependency_package() {
  local dependency="$1"
  local family="$2"

  case "$dependency" in
    git) printf '%s\n' "git" ;;
    curl) printf '%s\n' "curl" ;;
    bash) printf '%s\n' "bash" ;;
    chmod) printf '%s\n' "coreutils" ;;
    docker) printf '%s\n' "docker" ;;
    docker_compose)
      case "$family" in
        arch_like) printf '%s\n' "docker-compose" ;;
        ubuntu_like|debian_like|fedora_like) printf '%s\n' "docker-compose-plugin" ;;
        *) printf '%s\n' "docker compose" ;;
      esac
      ;;
  esac
}

append_missing() {
  local dependency="$1"
  local label="$2"
  missing_labels+=("$label")
  missing_packages+=("$(dependency_package "$dependency" "$distro_family")")
}

compose_available() {
  if has_command docker && docker compose version >/dev/null 2>&1; then
    return 0
  fi

  if has_command docker-compose && docker-compose version >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

detect_output="$("$SCRIPT_DIR/detect-distro.sh")"
distro_family="$(read_detect_value family "$detect_output")"
distro_name="$(read_detect_value pretty_name "$detect_output")"
supported="$(read_detect_value supported "$detect_output")"

missing_labels=()
missing_packages=()

has_command git || append_missing git "git"
has_command curl || append_missing curl "curl"
has_command bash || append_missing bash "bash"
has_command chmod || append_missing chmod "chmod"
has_command docker || append_missing docker "docker"
compose_available || append_missing docker_compose "docker compose"

installable=false
install_command=""
manual_instructions="Instale manualmente os pacotes listados e depois volte ao launcher para diagnosticar ou instalar novamente."

if [ "${#missing_labels[@]}" -gt 0 ] && [ "$supported" = "true" ] && has_command sudo; then
  case "$distro_family" in
    arch_like)
      installable=true
      install_command="sudo pacman -S --needed git curl docker docker-compose bash coreutils"
      ;;
    ubuntu_like|debian_like)
      installable=true
      install_command="sudo apt update && sudo apt install -y git curl docker.io docker-compose-plugin bash coreutils"
      ;;
    fedora_like)
      installable=true
      install_command="sudo dnf install -y git curl docker docker-compose-plugin bash coreutils"
      ;;
  esac
fi

if [ "$distro_family" = "opensuse_like" ]; then
  manual_instructions="Detectei openSUSE/SUSE, mas a instalação automática ainda não está habilitada com segurança. Instale git, curl, docker, docker compose, bash e coreutils pelo YaST ou zypper."
fi

cat <<JSON
{
  "os": "linux",
  "distroFamily": "$(json_escape "$distro_family")",
  "distroName": "$(json_escape "$distro_name")",
  "supported": $supported,
  "missing": $(json_string_array "${missing_labels[@]}"),
  "packages": $(json_string_array "${missing_packages[@]}"),
  "installable": $installable,
  "sudoRequired": $installable,
  "installCommand": "$(json_escape "$install_command")",
  "manualInstructions": "$(json_escape "$manual_instructions")"
}
JSON
