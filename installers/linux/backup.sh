#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

project_path="$(project_dir)"
[ -f "$project_path/docker-compose.yml" ] || fail "Projeto não encontrado em $project_path."

"$SCRIPT_DIR/ensure-docker-running.sh"

cd "$project_path"
ensure_env_file "$project_path"
run_compose --env-file .env.docker-local up -d postgres
wait_for_postgres 60 || fail "Postgres não ficou pronto para backup."

dest_dir="$(backup_dir)"
mkdir -p "$dest_dir"

stamp="$(date '+%Y-%m-%d-%H-%M')"
tmp_dir="$(mktemp -d)"
backup_file="$dest_dir/mg-pocket-backup-$stamp.tar.gz"

run_compose --env-file .env.docker-local exec -T postgres pg_dump -U meg -d meg_pocket > "$tmp_dir/postgres.sql"

if [ -f .env.docker-local ]; then
  cp .env.docker-local "$tmp_dir/env.docker-local"
fi

if [ -d storage/local/public ]; then
  mkdir -p "$tmp_dir/storage/local"
  cp -a storage/local/public "$tmp_dir/storage/local/public"
fi

tar -czf "$backup_file" -C "$tmp_dir" .
rm -rf "$tmp_dir"

info "$backup_file"
