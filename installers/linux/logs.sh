#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

project_path="$(project_dir)"
[ -f "$project_path/docker-compose.yml" ] || fail "Projeto não encontrado em $project_path."

cd "$project_path"

if [ "${1:-}" = "--follow" ] || [ "${1:-}" = "-f" ]; then
  run_compose --env-file .env.docker-local logs -f --tail=200
else
  run_compose --env-file .env.docker-local logs --tail=200
fi
