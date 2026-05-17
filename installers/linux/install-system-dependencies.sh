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

enable_docker_if_possible() {
  if has_command systemctl && has_command docker; then
    info "Habilitando serviço Docker..."
    sudo systemctl enable --now docker || true
  fi

  if has_command docker && [ -n "${USER:-}" ]; then
    sudo groupadd -f docker || true
    sudo usermod -aG docker "$USER" || true
  fi
}

detect_output="$("$SCRIPT_DIR/detect-distro.sh")"
family="$(read_detect_value family "$detect_output")"
distro_name="$(read_detect_value pretty_name "$detect_output")"

has_command sudo || fail "sudo não foi encontrado. Instale as dependências manualmente com o gerenciador de pacotes da sua distribuição."

info "Distribuição detectada: $distro_name"
info "O launcher vai instalar dependências do sistema para preparar o M&G Pocket."
info "Essa instalação pode pedir sua senha de administrador."
sudo -v

case "$family" in
  arch_like)
    has_command pacman || fail "pacman não foi encontrado nesta distribuição."
    info "Executando: sudo pacman -S --needed git curl docker docker-compose bash coreutils"
    sudo pacman -S --needed --noconfirm git curl docker docker-compose bash coreutils
    enable_docker_if_possible
    ;;
  ubuntu_like|debian_like)
    has_command apt-get || fail "apt-get não foi encontrado nesta distribuição."
    info "Executando: sudo apt update"
    sudo apt update
    info "Executando: sudo apt install -y git curl docker.io docker-compose-plugin bash coreutils"
    sudo apt install -y git curl docker.io docker-compose-plugin bash coreutils
    enable_docker_if_possible
    ;;
  fedora_like)
    has_command dnf || fail "dnf não foi encontrado nesta distribuição."
    info "Executando: sudo dnf install -y git curl docker docker-compose-plugin bash coreutils"
    sudo dnf install -y git curl docker docker-compose-plugin bash coreutils
    enable_docker_if_possible
    ;;
  *)
    fail "Não consegui identificar uma forma segura de instalar as dependências automaticamente nesta distribuição."
    ;;
esac

info "Dependências do sistema verificadas."
