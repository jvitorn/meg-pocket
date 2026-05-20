#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

has_command docker || fail "Docker não foi encontrado. Instale o Docker antes de iniciar o serviço."

if has_command systemctl; then
  if ! systemctl is-active --quiet docker 2>/dev/null; then
    info "Docker Engine não está ativo. Iniciando serviço docker..."
    if has_command sudo && sudo -n systemctl enable --now docker; then
      :
    elif has_command pkexec; then
      pkexec systemctl enable --now docker
    else
      fail "O Docker precisa ser iniciado com permissão administrativa. O launcher não pede senha na interface; autorize pelo terminal do sistema e tente novamente."
    fi
  fi
else
  info "systemctl não foi encontrado. Tentando validar Docker diretamente."
fi

if docker_info_works || sudo_docker_info_works_no_prompt; then
  info "Docker Engine está rodando."
  exit 0
fi

fail "Docker foi encontrado, mas o daemon não respondeu a docker info."
