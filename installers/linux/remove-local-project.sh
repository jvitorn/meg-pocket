#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

mode="${1:-safe}"
[ "$mode" = "safe" ] || [ "$mode" = "complete" ] || fail "modo de remoção inválido."

project_path="$(project_dir)"
default_path="$HOME/.local/share/mg-pocket/app"

if [ ! -d "$project_path" ]; then
  info "Projeto local não encontrado em $project_path."
  exit 0
fi

project_path="$(cd "$project_path" && pwd -P)"
default_path="$(mkdir -p "$(dirname "$default_path")" && cd "$(dirname "$default_path")" && printf '%s/app\n' "$(pwd -P)")"

[ "$project_path" != "/" ] || fail "caminho de remoção inválido."
[ "$project_path" != "$HOME" ] || fail "caminho de remoção inválido."
[ -f "$project_path/docker-compose.yml" ] || fail "não encontrei docker-compose.yml no projeto local. Remoção cancelada."
[ -f "$project_path/package.json" ] || fail "não encontrei package.json no projeto local. Remoção cancelada."

if [ "$project_path" != "$default_path" ] && [ "${MG_POCKET_ALLOW_CUSTOM_PROJECT_DELETE:-}" != "1" ]; then
  fail "o caminho do projeto não é o diretório local esperado do launcher. Remoção cancelada por segurança: $project_path"
fi

cd "$project_path"

if [ "$mode" = "complete" ]; then
  info "Remoção completa: parando containers e removendo volumes/redes do projeto."
  if [ -f ".env.docker-local" ]; then
    (run_compose --env-file .env.docker-local down -v --remove-orphans) || true
  else
    (run_compose down -v --remove-orphans) || true
  fi
else
  info "Remoção segura: parando containers e preservando volumes Docker."
  if [ -f ".env.docker-local" ]; then
    (run_compose --env-file .env.docker-local down --remove-orphans) || true
  else
    (run_compose down --remove-orphans) || true
  fi
fi

cd /
rm -rf -- "$project_path"
info "Projeto local removido de $project_path."
