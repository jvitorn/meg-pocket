#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

has_command apt-get || fail "apt-get não foi encontrado. Esta instalação é apenas para Ubuntu/Debian e derivados."
has_command dpkg || fail "dpkg não foi encontrado. Não foi possível detectar a arquitetura para o repositório Docker."

# shellcheck source=/etc/os-release
source /etc/os-release

repo_os="debian"
repo_codename="${VERSION_CODENAME:-${DEBIAN_CODENAME:-}}"

case "${ID:-}" in
  ubuntu)
    repo_os="ubuntu"
    repo_codename="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
    ;;
  debian)
    repo_os="debian"
    repo_codename="${VERSION_CODENAME:-${DEBIAN_CODENAME:-}}"
    ;;
  *)
    if printf '%s' "${ID_LIKE:-}" | grep -Eq '(^|[[:space:]])ubuntu($|[[:space:]])'; then
      repo_os="ubuntu"
      repo_codename="${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}"
    elif printf '%s' "${ID_LIKE:-}" | grep -Eq '(^|[[:space:]])debian($|[[:space:]])'; then
      repo_os="debian"
      repo_codename="${VERSION_CODENAME:-${DEBIAN_CODENAME:-}}"
    fi
    ;;
esac

[ -n "$repo_codename" ] || fail "não foi possível detectar o codinome da distribuição para configurar o repositório Docker."

sudo -v

info "Atualizando pacotes base..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

info "Configurando chave GPG e repositório oficial Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
tmp_gpg="$(mktemp)"
curl -fsSL "https://download.docker.com/linux/$repo_os/gpg" -o "$tmp_gpg"
sudo rm -f /etc/apt/keyrings/docker.gpg
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg "$tmp_gpg"
rm -f "$tmp_gpg"
sudo chmod a+r /etc/apt/keyrings/docker.gpg

arch="$(dpkg --print-architecture)"
repo_line="deb [arch=$arch signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$repo_os $repo_codename stable"
printf '%s\n' "$repo_line" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

info "Instalando Docker Engine e plugin Docker Compose..."
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

info "Habilitando serviço Docker..."
sudo systemctl enable --now docker
sudo groupadd -f docker
sudo usermod -aG docker "$USER"

docker --version || sudo docker --version
docker compose version || sudo docker compose version
docker info >/dev/null 2>&1 || sudo docker info >/dev/null

"$SCRIPT_DIR/ensure-docker-permission.sh"
