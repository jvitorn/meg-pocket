#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# shellcheck source=../linux/lib.sh
source "$ROOT_DIR/installers/linux/lib.sh"

assert_eq() {
  local actual="$1"
  local expected="$2"
  if [ "$actual" != "$expected" ]; then
    printf 'Esperado "%s", recebido "%s"\n' "$expected" "$actual" >&2
    exit 1
  fi
}

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
PATH="$tmp_dir:$PATH"

cat > "$tmp_dir/docker" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "compose" ] && [ "$2" = "version" ]; then
  echo "Docker Compose version v2.fake"
  exit 0
fi
exit 1
EOF
chmod +x "$tmp_dir/docker"

assert_eq "$(compose_cmd)" "docker compose"

cat > "$tmp_dir/docker" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
chmod +x "$tmp_dir/docker"

cat > "$tmp_dir/docker-compose" <<'EOF'
#!/usr/bin/env bash
if [ "$1" = "version" ]; then
  echo "Docker Compose version v1.fake"
  exit 0
fi
exit 1
EOF
chmod +x "$tmp_dir/docker-compose"

assert_eq "$(compose_cmd)" "docker-compose"

printf 'test-compose-helper: ok\n'
