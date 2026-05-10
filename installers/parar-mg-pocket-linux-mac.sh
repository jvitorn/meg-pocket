#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
  export MG_POCKET_PROJECT_DIR="$PROJECT_DIR"
fi

exec "$SCRIPT_DIR/linux/stop.sh"
