#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$(uname -s)" in
  Linux)
    printf 'Este script foi migrado para o fluxo v1.1.\n'
    printf 'Ele agora baixa e abre o M&G Pocket Launcher; a instalação acontece pela interface visual.\n\n'
    exec "$SCRIPT_DIR/bootstrap/linux.sh"
    ;;
  Darwin)
    cat <<'MSG'
O instalador automático v1.1 tem suporte inicial oficial para Linux.
No macOS, instale Docker Desktop manualmente e use o fluxo manual avançado com Docker Compose.
MSG
    exit 1
    ;;
  *)
    printf 'Sistema não suportado por este script.\n' >&2
    exit 1
    ;;
esac
