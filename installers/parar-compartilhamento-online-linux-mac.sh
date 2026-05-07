#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.cloudflared-tunnel.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "Nenhum compartilhamento online iniciado por este script foi encontrado."
  exit 0
fi

PID="$(cat "$PID_FILE")"

if kill -0 "$PID" >/dev/null 2>&1; then
  kill "$PID"
  rm -f "$PID_FILE"
  echo "Compartilhamento online desligado."
  echo "O link temporário deixou de funcionar."
else
  rm -f "$PID_FILE"
  echo "O compartilhamento online já estava desligado."
fi
