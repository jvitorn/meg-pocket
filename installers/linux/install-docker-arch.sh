#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

has_command pacman || fail "pacman não foi encontrado. Esta instalação é apenas para Arch Linux e derivados."

sudo -v

info "Instalando Docker e Docker Compose com pacman..."
sudo pacman -Sy --needed --noconfirm docker docker-compose

info "Habilitando serviço Docker..."
sudo systemctl enable --now docker
sudo groupadd -f docker
sudo usermod -aG docker "$USER"

docker --version || sudo docker --version
docker compose version || docker-compose version || sudo docker compose version || sudo docker-compose version
docker info >/dev/null 2>&1 || sudo docker info >/dev/null

"$SCRIPT_DIR/ensure-docker-permission.sh"
