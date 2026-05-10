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

if has_command docker; then
  info "Docker já está instalado. Não será reinstalado."
  "$SCRIPT_DIR/ensure-docker-running.sh"
  "$SCRIPT_DIR/ensure-docker-permission.sh"
  exit 0
fi

detect_output="$("$SCRIPT_DIR/detect-distro.sh")"
family="$(read_detect_value family "$detect_output")"
distro_name="$(read_detect_value pretty_name "$detect_output")"

case "$family" in
  ubuntu_like|debian_like)
    info "Distribuição detectada: $distro_name"
    info "Instalando Docker pelo repositório oficial da Docker."
    sudo -v
    exec "$SCRIPT_DIR/install-docker-ubuntu.sh"
    ;;
  arch_like)
    info "Distribuição detectada: $distro_name"
    info "Instalando Docker com pacman."
    sudo -v
    exec "$SCRIPT_DIR/install-docker-arch.sh"
    ;;
  *)
    cat >&2 <<'MSG'
Esta distribuição ainda não é suportada pelo instalador automático.
Instale o Docker manualmente e depois volte para o launcher.
MSG
    exit 1
    ;;
esac
