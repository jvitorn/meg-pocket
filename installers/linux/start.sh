#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

"$SCRIPT_DIR/ensure-docker-running.sh"

project_path="$(project_dir)"
[ -f "$project_path/docker-compose.yml" ] || fail "Projeto não encontrado em $project_path. Instale/atualize o M&G Pocket primeiro."

cd "$project_path"
mkdir -p storage/local/public public/uploads
ensure_env_file "$project_path"
cleanup_legacy_app_compose_project

run_compose --env-file .env.docker-local up -d postgres app nginx
start_optional_adminer
wait_for_app_database 60 || fail "M&G Pocket iniciou, mas o app ainda não consegue acessar o Postgres."

if wait_for_url "http://localhost:3000" 60 2; then
  info "M&G Pocket iniciado em http://localhost:3000"
else
  fail "M&G Pocket foi iniciado, mas http://localhost:3000 não respondeu a tempo."
fi
