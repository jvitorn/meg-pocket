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

stamp="$(date '+%Y-%m-%d-%H%M')"
backup_file="$dest_dir/meg-pocket-db-$stamp.sql"

run_compose --env-file .env.docker-local exec -T postgres pg_dump -U meg -d meg_pocket > "$backup_file"

info "$backup_file"
