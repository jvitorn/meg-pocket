#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

confirm="${1:-}"
skip_backup="${2:-}"

if [ "$confirm" != "--yes" ]; then
  printf 'Resetar dados locais apagará banco e storage do M&G Pocket neste computador.\n'
  printf 'Digite RESETAR para continuar: '
  read -r answer
  [ "$answer" = "RESETAR" ] || fail "reset cancelado."
fi

project_path="$(project_dir)"
[ -f "$project_path/docker-compose.yml" ] || fail "Projeto não encontrado em $project_path."

if [ "$skip_backup" != "--skip-backup" ]; then
  info "Criando backup antes do reset..."
  "$SCRIPT_DIR/backup.sh" || info "Backup automático falhou. Continuando somente porque o reset foi confirmado explicitamente."
fi

cd "$project_path"
run_compose --env-file .env.docker-local down -v
rm -rf storage/local/public
mkdir -p storage/local/public
rm -rf public/uploads
mkdir -p public/uploads
rm -f installers/.seed-inicial-concluido

"$SCRIPT_DIR/install-project.sh"
info "Dados locais resetados."
