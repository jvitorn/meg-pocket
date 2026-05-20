#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT_DIR/installers/linux/detect-distro.sh"

assert_contains() {
  local text="$1"
  local expected="$2"
  if ! printf '%s\n' "$text" | grep -F "$expected" >/dev/null; then
    printf 'Esperado encontrar "%s" em:\n%s\n' "$expected" "$text" >&2
    exit 1
  fi
}

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cat > "$tmp_dir/ubuntu" <<'EOF'
ID=ubuntu
PRETTY_NAME="Ubuntu 24.04 LTS"
ID_LIKE=debian
EOF

cat > "$tmp_dir/mint" <<'EOF'
ID=linuxmint
PRETTY_NAME="Linux Mint"
ID_LIKE="ubuntu debian"
EOF

cat > "$tmp_dir/debian" <<'EOF'
ID=debian
PRETTY_NAME="Debian GNU/Linux"
EOF

cat > "$tmp_dir/arch" <<'EOF'
ID=endeavouros
PRETTY_NAME="EndeavourOS"
ID_LIKE=arch
EOF

cat > "$tmp_dir/fedora" <<'EOF'
ID=fedora
PRETTY_NAME="Fedora Linux"
ID_LIKE="rhel fedora"
EOF

assert_contains "$(OS_RELEASE_FILE="$tmp_dir/ubuntu" "$SCRIPT")" "family=ubuntu_like"
assert_contains "$(OS_RELEASE_FILE="$tmp_dir/mint" "$SCRIPT")" "family=ubuntu_like"
assert_contains "$(OS_RELEASE_FILE="$tmp_dir/debian" "$SCRIPT")" "family=debian_like"
assert_contains "$(OS_RELEASE_FILE="$tmp_dir/arch" "$SCRIPT")" "family=arch_like"
assert_contains "$(OS_RELEASE_FILE="$tmp_dir/fedora" "$SCRIPT")" "family=fedora_like"

printf 'test-detect-distro: ok\n'
