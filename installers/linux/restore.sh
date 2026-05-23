#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

backup_file="${1:-}"
confirm="${2:-}"

[ -n "$backup_file" ] || fail "informe o caminho do backup: restore.sh <arquivo.sql>"
[ -f "$backup_file" ] || fail "backup não encontrado: $backup_file"

if [ "$confirm" != "--yes" ]; then
  printf 'Restaurar este backup substituirá os dados locais atuais.\n'
  printf 'Digite RESTAURAR para continuar: '
  read -r answer
  [ "$answer" = "RESTAURAR" ] || fail "restauração cancelada."
fi

project_path="$(project_dir)"
[ -f "$project_path/docker-compose.yml" ] || fail "Projeto não encontrado em $project_path."

"$SCRIPT_DIR/ensure-docker-running.sh"

cd "$project_path"
ensure_env_file "$project_path"

run_compose --env-file .env.docker-local stop app adminer nginx >/dev/null 2>&1 || true
run_compose --env-file .env.docker-local up -d postgres
wait_for_postgres 60 || fail "Postgres não ficou pronto para restore."

case "$backup_file" in
  *.sql)
    run_compose --env-file .env.docker-local exec -T postgres psql -U meg -d meg_pocket -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    run_compose --env-file .env.docker-local exec -T postgres psql -U meg -d meg_pocket < "$backup_file"
    ;;
  *.dump)
    run_compose --env-file .env.docker-local exec -T postgres pg_restore --clean --if-exists --no-owner -U meg -d meg_pocket < "$backup_file"
    ;;
  *)
    fail "formato de backup inválido. Use .sql ou .dump."
    ;;
esac
"$SCRIPT_DIR/start.sh"
info "Backup restaurado."
