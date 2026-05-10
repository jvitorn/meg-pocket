#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT="$("$ROOT_DIR/installers/linux/doctor.sh")"

if command -v node >/dev/null 2>&1; then
  printf '%s\n' "$OUTPUT" | node -e "let s=''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => { const o = JSON.parse(s); if (o.os !== 'linux') process.exit(1); });"
else
  printf '%s\n' "$OUTPUT" | grep -F '"os": "linux"' >/dev/null
  printf '%s\n' "$OUTPUT" | grep -F '"dockerInstalled"' >/dev/null
fi

printf 'test-doctor-output: ok\n'
