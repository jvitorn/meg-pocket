#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$SCRIPT_DIR/.cloudflared-tunnel.pid"
LOG_FILE="$SCRIPT_DIR/cloudflared-tunnel.log"

fail() {
  echo
  echo "$1"
  exit 1
}

command -v cloudflared >/dev/null 2>&1 || fail "cloudflared não foi encontrado. Instale o Cloudflare Tunnel antes de usar este compartilhamento opcional."

cd "$PROJECT_DIR"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" >/dev/null 2>&1; then
  echo "O compartilhamento online já parece estar ativo."
  echo "Log: $LOG_FILE"
  exit 0
fi

echo "Compartilhamento online opcional do M&G Pocket"
echo
echo "Atenção: o link gerado ficará público na internet enquanto o túnel estiver ligado."
echo "Compartilhe apenas com os jogadores da sua mesa."
echo "Somente http://localhost:3000 será exposto. Banco, Adminer e storage interno não serão expostos."
echo

docker compose up -d app >/dev/null

: > "$LOG_FILE"
cloudflared tunnel --url http://localhost:3000 > "$LOG_FILE" 2>&1 &
echo "$!" > "$PID_FILE"

echo "Túnel iniciado. Procurando o link público..."
sleep 5

public_url="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$LOG_FILE" | tail -n 1 || true)"

if [ -n "$public_url" ]; then
  echo
  echo "Compartilhamento online iniciado."
  echo "Link temporário: $public_url"
else
  echo
  echo "O túnel foi iniciado, mas o link ainda não apareceu no log."
  echo "Aguarde alguns segundos e consulte:"
  echo "$LOG_FILE"
fi

echo
echo "Para desligar o link:"
echo "./installers/parar-compartilhamento-online-linux-mac.sh"
