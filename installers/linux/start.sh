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
wait_for_app_alive 60 || {
  run_compose --env-file .env.docker-local logs --tail=100 app || true
  fail "O aplicativo não respondeu ao healthcheck. Veja os logs do app."
}
warn_if_database_unavailable

if wait_for_url "http://localhost:3000/api/health" 60 2; then
  info "M&G Pocket iniciado em http://localhost:3000"
else
  fail "O proxy local não iniciou. Verifique se a porta já está em uso."
fi
