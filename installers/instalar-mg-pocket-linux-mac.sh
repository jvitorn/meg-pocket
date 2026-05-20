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
O launcher v1.1 publica artefatos testáveis apenas para Linux e Windows.
macOS não é suportado por este instalador enquanto não houver validação local desses builds.
MSG
    exit 1
    ;;
  *)
    printf 'Sistema não suportado por este script.\n' >&2
    exit 1
    ;;
esac
