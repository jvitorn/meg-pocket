#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"
mkdir -p storage/local/public

docker compose up -d

echo
echo "M&G Pocket iniciado."
echo "Acesse: http://localhost:3000"
