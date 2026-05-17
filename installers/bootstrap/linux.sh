#!/usr/bin/env bash
set -euo pipefail

REPO="${MG_POCKET_REPO:-jvitorn/meg-pocket}"
LAUNCHER_DIR="${MG_POCKET_LAUNCHER_DIR:-$HOME/.local/share/mg-pocket-launcher}"
RELEASES_URL="https://github.com/$REPO/releases"
API_URL="https://api.github.com/repos/$REPO/releases/latest"

fail() {
  printf '\nErro: %s\n' "$1" >&2
  exit 1
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

download_stdout() {
  local url="$1"
  if has_command curl; then
    curl -fsSL "$url"
  elif has_command wget; then
    wget -qO- "$url"
  else
    fail "curl ou wget é necessário para baixar o launcher."
  fi
}

download_file() {
  local url="$1"
  local path="$2"
  if has_command curl; then
    curl -fL "$url" -o "$path"
  elif has_command wget; then
    wget -O "$path" "$url"
  else
    fail "curl ou wget é necessário para baixar o launcher."
  fi
}

arch="$(uname -m)"
case "$arch" in
  x86_64|amd64)
    arch_pattern='(x86_64|amd64)'
    ;;
  aarch64|arm64)
    arch_pattern='(aarch64|arm64)'
    ;;
  *)
    fail "arquitetura ainda não suportada pelo bootstrap: $arch"
    ;;
esac

mkdir -p "$LAUNCHER_DIR"

release_json="$(download_stdout "$API_URL" || true)"
appimage_urls="$(printf '%s\n' "$release_json" \
  | grep -Eo '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]+\.AppImage"' \
  | sed -E 's/^"browser_download_url"[[:space:]]*:[[:space:]]*"([^"]+)"/\1/' || true)"
appimage_url="$(printf '%s\n' "$appimage_urls" | grep -Ei "$arch_pattern" | head -n 1 || true)"

if [ -z "$appimage_url" ]; then
  appimage_url="$(printf '%s\n' "$appimage_urls" | head -n 1 || true)"
fi

if [ -z "$appimage_url" ]; then
  cat >&2 <<MSG
Não encontrei um AppImage publicado na última release.
Abra a página de releases e baixe o M&G Pocket Launcher manualmente:
$RELEASES_URL
MSG
  if has_command xdg-open; then
    xdg-open "$RELEASES_URL" >/dev/null 2>&1 || true
  fi
  exit 1
fi

launcher_file="$LAUNCHER_DIR/$(basename "$appimage_url")"
printf 'Baixando launcher: %s\n' "$launcher_file"
download_file "$appimage_url" "$launcher_file"

checksums_url="$(printf '%s\n' "$release_json" \
  | grep -Eo '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]+checksums[^"]*\.txt"' \
  | sed -E 's/^"browser_download_url"[[:space:]]*:[[:space:]]*"([^"]+)"/\1/' \
  | head -n 1 || true)"

if [ -n "$checksums_url" ] && has_command sha256sum; then
  checksums_file="$LAUNCHER_DIR/checksums.txt"
  download_file "$checksums_url" "$checksums_file"
  if grep -F "  $(basename "$launcher_file")" "$checksums_file" >/dev/null 2>&1; then
    (cd "$LAUNCHER_DIR" && grep -F "  $(basename "$launcher_file")" checksums.txt | sha256sum -c -)
  else
    printf 'checksums.txt encontrado, mas sem entrada para %s. Pulando validação.\n' "$(basename "$launcher_file")"
  fi
else
  printf 'Checksum não disponível. Continuando sem validação SHA-256.\n'
fi

chmod +x "$launcher_file"
launcher_link="$LAUNCHER_DIR/MGPocketLauncher.AppImage"
ln -sf "$(basename "$launcher_file")" "$launcher_link"
chmod +x "$launcher_link"

launcher_runner="$LAUNCHER_DIR/run-launcher.sh"
cat > "$launcher_runner" <<'RUNNER'
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE="${MG_POCKET_LAUNCHER_APPIMAGE:-$SCRIPT_DIR/MGPocketLauncher.AppImage}"

wayland_preload=""
for candidate in \
  /usr/lib/libwayland-client.so \
  /usr/lib/libwayland-client.so.0 \
  /usr/lib64/libwayland-client.so \
  /usr/lib64/libwayland-client.so.0; do
  if [ -r "$candidate" ]; then
    wayland_preload="$candidate"
    break
  fi
done

export WEBKIT_DISABLE_COMPOSITING_MODE="${WEBKIT_DISABLE_COMPOSITING_MODE:-1}"
export WEBKIT_DISABLE_DMABUF_RENDERER="${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"

if [ -n "$wayland_preload" ]; then
  export LD_PRELOAD="$wayland_preload${LD_PRELOAD:+:$LD_PRELOAD}"
fi

exec "$APPIMAGE" "$@"
RUNNER
chmod +x "$launcher_runner"

desktop_dir="$HOME/.local/share/applications"
if [ -d "$desktop_dir" ] || mkdir -p "$desktop_dir"; then
  desktop_file="$desktop_dir/mg-pocket-launcher.desktop"
  desktop_exec="$(printf '%s' "$launcher_runner" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  cat > "$desktop_file" <<DESKTOP
[Desktop Entry]
Type=Application
Name=M&G Pocket Launcher
Comment=Instalador e gerenciador local do M&G Pocket
Exec="$desktop_exec"
Terminal=false
Categories=Game;Utility;
DESKTOP
  chmod +x "$desktop_file"
fi

printf 'Abrindo M&G Pocket Launcher...\n'
nohup "$launcher_runner" >/tmp/mg-pocket-launcher.log 2>&1 &
