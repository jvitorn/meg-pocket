#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

backup_file="${1:-}"
confirm="${2:-}"

[ -n "$backup_file" ] || fail "informe o caminho do backup: restore.sh <arquivo.tar.gz>"
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
tmp_dir="$(mktemp -d)"
tar -xzf "$backup_file" -C "$tmp_dir"

if [ -f "$tmp_dir/env.docker-local" ]; then
  cp "$tmp_dir/env.docker-local" .env.docker-local
else
  ensure_env_file "$project_path"
fi

run_compose --env-file .env.docker-local stop app adminer storage >/dev/null 2>&1 || true
run_compose --env-file .env.docker-local up -d postgres
wait_for_postgres 60 || fail "Postgres não ficou pronto para restore."

if [ -f "$tmp_dir/postgres.sql" ]; then
  run_compose --env-file .env.docker-local exec -T postgres psql -U meg -d meg_pocket -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  run_compose --env-file .env.docker-local exec -T postgres psql -U meg -d meg_pocket < "$tmp_dir/postgres.sql"
else
  fail "backup não contém postgres.sql."
fi

if [ -d "$tmp_dir/storage/local/public" ]; then
  rm -rf storage/local/public
  mkdir -p storage/local
  cp -a "$tmp_dir/storage/local/public" storage/local/public
fi

rm -rf "$tmp_dir"
"$SCRIPT_DIR/start.sh"
info "Backup restaurado."
