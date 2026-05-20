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

if sudo_docker_info_works_no_prompt; then
  sudo -n groupadd -f docker
  sudo -n usermod -aG docker "$USER"
  printf 'dockerPermissionOk=false\n'
  printf 'sudoDockerWorks=true\n'
  printf 'requiresRelogin=true\n'
  printf 'message=%s\n' "Usuário adicionado ao grupo docker. Talvez seja necessário sair e entrar novamente na sessão."
  exit 0
fi

if has_command pkexec && pkexec docker info >/dev/null 2>&1; then
  pkexec sh -c 'groupadd -f docker && usermod -aG docker "$1"' sh "$USER"
  printf 'dockerPermissionOk=false\n'
  printf 'sudoDockerWorks=false\n'
  printf 'requiresRelogin=true\n'
  printf 'message=%s\n' "Usuário adicionado ao grupo docker. Saia da sessão do Linux e entre novamente para ativar a permissão."
  exit 0
fi

fail "Docker não está acessível para seu usuário e o launcher não pode pedir senha na interface. Use a ação administrativa guiada ou configure o grupo docker manualmente."
