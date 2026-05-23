#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

download_zip_project() {
  local target_dir="$1"
  local tmp_dir
  local zip_file
  local extracted

  has_command unzip || fail "Git não foi encontrado e o fallback por ZIP precisa do comando unzip."

  tmp_dir="$(mktemp -d)"
  zip_file="$tmp_dir/meg-pocket.zip"

  if has_command curl; then
    curl -L "$MG_POCKET_ZIP_URL" -o "$zip_file"
  elif has_command wget; then
    wget -O "$zip_file" "$MG_POCKET_ZIP_URL"
  else
    fail "Git não foi encontrado. Instale git, curl ou wget para baixar o projeto."
  fi

  unzip -q "$zip_file" -d "$tmp_dir"
  extracted="$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [ -n "$extracted" ] || fail "o ZIP do projeto não gerou uma pasta válida."
  mv "$extracted" "$target_dir"
  rm -rf "$tmp_dir"
}

prepare_project_source() {
  local dir="$1"
  local parent

  parent="$(dirname "$dir")"
  mkdir -p "$parent"

  if [ -d "$dir/.git" ]; then
    info "Projeto já existe. Atualizando com git pull --ff-only..."
    git -C "$dir" pull --ff-only
    return 0
  fi

  if [ -f "$dir/docker-compose.yml" ]; then
    info "Projeto já existe em $dir. Mantendo arquivos locais."
    return 0
  fi

  if [ -e "$dir" ]; then
    fail "o caminho $dir já existe, mas não parece ser o projeto M&G Pocket."
  fi

  if has_command git; then
    info "Baixando projeto com git clone..."
    git clone "$MG_POCKET_REPO_URL" "$dir"
  else
    info "Git não encontrado. Baixando projeto por ZIP..."
    download_zip_project "$dir"
  fi
}

"$SCRIPT_DIR/ensure-docker-running.sh"
"$SCRIPT_DIR/ensure-docker-permission.sh" || true
ensure_docker_permission_or_explicit_sudo

project_path="$(project_dir)"
prepare_project_source "$project_path"

cd "$project_path"
[ -f docker-compose.yml ] || fail "docker-compose.yml não foi encontrado em $project_path."

mkdir -p storage/local/public public/uploads installers
ensure_env_file "$project_path"
cleanup_legacy_app_compose_project

info "Baixando versão pronta do M&G Pocket..."
run_compose --env-file .env.docker-local pull app maintenance

info "Subindo Postgres..."
run_compose --env-file .env.docker-local up -d postgres

info "Aguardando Postgres ficar pronto..."
wait_for_postgres 60 || fail "o banco de dados não ficou pronto a tempo."

info "Aplicando migrations e preparando Prisma..."
run_compose --env-file .env.docker-local run --rm maintenance npm run db:setup

seed_status="$(seed_ready || true)"
seed_marker="installers/.seed-inicial-concluido"

if [ -f "$seed_marker" ] || [ "$seed_status" = "1" ]; then
  info "Seed inicial já foi executado ou dados essenciais já existem. Pulando seed."
  touch "$seed_marker"
else
  info "Executando seed inicial com os dados essenciais do RPG..."
  run_compose --env-file .env.docker-local run --rm maintenance npm run db:seed
  touch "$seed_marker"
fi

info "Iniciando M&G Pocket..."
run_compose --env-file .env.docker-local up -d app nginx
start_optional_adminer

info "Validando conexão do app com o banco de dados..."
wait_for_app_alive 60 || {
  run_compose --env-file .env.docker-local logs --tail=100 app || true
  fail "O M&G Pocket ainda não respondeu. Veja os detalhes técnicos."
}
warn_if_database_unavailable

info "Validando acesso local..."
if wait_for_url "http://localhost:3000/api/health" 60 2; then
  info "M&G Pocket instalado e online em http://localhost:3000"
else
  fail "Não conseguimos abrir o M&G Pocket agora. Algum serviço ainda pode estar iniciando ou outro programa pode estar usando o endereço local."
fi

info "Validação automatizada completa fica reservada ao ambiente de desenvolvimento/CI para poupar esta máquina."
