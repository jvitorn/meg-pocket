#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

has_command docker || fail "Docker não foi encontrado."

if docker_info_works; then
  printf 'dockerPermissionOk=true\n'
  printf 'sudoDockerWorks=false\n'
  printf 'requiresRelogin=false\n'
  exit 0
fi

if sudo_docker_info_works; then
  sudo groupadd -f docker
  sudo usermod -aG docker "$USER"
  printf 'dockerPermissionOk=false\n'
  printf 'sudoDockerWorks=true\n'
  printf 'requiresRelogin=true\n'
  printf 'message=%s\n' "Usuário adicionado ao grupo docker. Talvez seja necessário sair e entrar novamente na sessão."
  exit 0
fi

fail "Docker não respondeu nem com sudo. Verifique se o serviço docker está ativo."
