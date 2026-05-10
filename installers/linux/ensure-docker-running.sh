#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

has_command docker || fail "Docker não foi encontrado. Instale o Docker antes de iniciar o serviço."

if has_command systemctl; then
  if ! systemctl is-active --quiet docker 2>/dev/null; then
    info "Docker Engine não está ativo. Iniciando serviço docker..."
    sudo systemctl enable --now docker
  fi
else
  info "systemctl não foi encontrado. Tentando validar Docker diretamente."
fi

if docker_info_works || sudo_docker_info_works; then
  info "Docker Engine está rodando."
  exit 0
fi

fail "Docker foi encontrado, mas o daemon não respondeu a docker info."
