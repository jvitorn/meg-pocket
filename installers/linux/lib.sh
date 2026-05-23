#!/usr/bin/env bash

MG_POCKET_REPO_URL="${MG_POCKET_REPO_URL:-https://github.com/jvitorn/meg-pocket.git}"
MG_POCKET_ZIP_URL="${MG_POCKET_ZIP_URL:-https://github.com/jvitorn/meg-pocket/archive/refs/heads/master.zip}"
MG_POCKET_PROJECT_DIR="${MG_POCKET_PROJECT_DIR:-$HOME/.local/share/mg-pocket/app}"
MG_POCKET_CONFIG_DIR="${MG_POCKET_CONFIG_DIR:-$HOME/.config/mg-pocket}"
MG_POCKET_LAUNCHER_DIR="${MG_POCKET_LAUNCHER_DIR:-$HOME/.local/share/mg-pocket-launcher}"

fail() {
  printf '\nErro: %s\n' "$1" >&2
  exit 1
}

info() {
  printf '%s\n' "$*"
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

project_dir() {
  printf '%s\n' "$MG_POCKET_PROJECT_DIR"
}

config_dir() {
  printf '%s\n' "$MG_POCKET_CONFIG_DIR"
}

backup_dir() {
  if [ -d "$HOME/Documentos" ]; then
    printf '%s\n' "$HOME/Documentos/MG Pocket/backups"
  elif [ -d "$HOME/Documents" ]; then
    printf '%s\n' "$HOME/Documents/MG Pocket/backups"
  else
    printf '%s\n' "$HOME/.local/share/mg-pocket/backups"
  fi
}

launcher_dir() {
  printf '%s\n' "$MG_POCKET_LAUNCHER_DIR"
}

compose_project_name() {
  printf '%s\n' "${MG_POCKET_COMPOSE_PROJECT_NAME:-meg-pocket}"
}

http_ok() {
  local url="$1"

  if has_command curl; then
    curl -fsS --max-time 4 "$url" >/dev/null 2>&1
    return $?
  fi

  if has_command wget; then
    wget -q --spider --timeout=4 "$url" >/dev/null 2>&1
    return $?
  fi

  return 1
}

wait_for_url() {
  local url="$1"
  local attempts="${2:-60}"
  local delay="${3:-2}"
  local i

  for i in $(seq 1 "$attempts"); do
    if http_ok "$url"; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

compose_cmd() {
  if [ "${MG_POCKET_DOCKER_USE_SUDO:-}" = "1" ]; then
    if has_command sudo && has_command docker && sudo -n docker compose version >/dev/null 2>&1; then
      printf '%s\n' "sudo -n docker compose"
      return 0
    fi

    if has_command sudo && has_command docker-compose && sudo -n docker-compose version >/dev/null 2>&1; then
      printf '%s\n' "sudo -n docker-compose"
      return 0
    fi

    return 1
  fi

  if has_command docker && docker compose version >/dev/null 2>&1; then
    printf '%s\n' "docker compose"
    return 0
  fi

  if has_command docker-compose && docker-compose version >/dev/null 2>&1; then
    printf '%s\n' "docker-compose"
    return 0
  fi

  return 1
}

run_compose() {
  local cmd
  local project_name
  local -a parts

  cmd="$(compose_cmd)" || fail "Docker Compose não foi encontrado ou não está acessível."
  project_name="$(compose_project_name)"
  read -r -a parts <<< "$cmd"
  "${parts[@]}" --project-name "$project_name" "$@"
}

run_compose_project() {
  local project_name="$1"
  local cmd
  local -a parts
  shift

  cmd="$(compose_cmd)" || fail "Docker Compose não foi encontrado ou não está acessível."
  read -r -a parts <<< "$cmd"
  "${parts[@]}" --project-name "$project_name" "$@"
}

run_compose_no_prompt_cmd() {
  if [ "${MG_POCKET_DOCKER_USE_SUDO:-}" = "1" ]; then
    if has_command sudo && has_command docker && sudo -n docker compose version >/dev/null 2>&1; then
      printf '%s\n' "sudo -n docker compose"
      return 0
    fi

    if has_command sudo && has_command docker-compose && sudo -n docker-compose version >/dev/null 2>&1; then
      printf '%s\n' "sudo -n docker-compose"
      return 0
    fi

    return 1
  fi

  if has_command docker && docker compose version >/dev/null 2>&1; then
    printf '%s\n' "docker compose"
    return 0
  fi

  if has_command docker-compose && docker-compose version >/dev/null 2>&1; then
    printf '%s\n' "docker-compose"
    return 0
  fi

  if has_command sudo && has_command docker && sudo -n docker compose version >/dev/null 2>&1; then
    printf '%s\n' "sudo -n docker compose"
    return 0
  fi

  if has_command sudo && has_command docker-compose && sudo -n docker-compose version >/dev/null 2>&1; then
    printf '%s\n' "sudo -n docker-compose"
    return 0
  fi

  return 1
}

docker_info_works() {
  has_command docker && docker info >/dev/null 2>&1
}

sudo_docker_info_works_no_prompt() {
  has_command sudo && has_command docker && sudo -n docker info >/dev/null 2>&1
}

docker_needs_relogin_but_sudo_works() {
  ! docker_info_works && sudo_docker_info_works_no_prompt
}

ensure_docker_permission_or_explicit_sudo() {
  if docker_info_works; then
    return 0
  fi

  if [ "${MG_POCKET_DOCKER_USE_SUDO:-}" = "1" ]; then
    sudo_docker_info_works_no_prompt || fail "O sudo para Docker não está autorizado nesta sessão. Abra os logs e tente novamente depois de validar sua permissão administrativa pelo sistema."
    return 0
  fi

  if sudo_docker_info_works_no_prompt; then
    fail "Permissão do Docker ainda não está ativa. Salve seus arquivos, saia da sessão do Linux e entre novamente. Depois abra o launcher e clique em Preparar Ambiente. Se preferir continuar temporariamente, escolha a opção de usar sudo nesta sessão no launcher."
  fi

  fail "Docker não está acessível para seu usuário. Use o fluxo de permissões do launcher antes de continuar."
}

ensure_project_ready_dir() {
  local dir
  dir="$(project_dir)"
  mkdir -p "$dir"
}

ensure_env_file() {
  local dir="$1"
  local env_file="$dir/.env.docker-local"
  local secret

  if [ -f "$env_file" ]; then
    info ".env.docker-local já existe. Mantendo arquivo atual."
    return 0
  fi

  if [ -f "$dir/.env.example" ]; then
    cp "$dir/.env.example" "$env_file"
  else
    cat > "$env_file" <<'ENV'
DATABASE_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
DIRECT_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
NEXTAUTH_SECRET="meg-pocket-local-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
APP_PORT="3000"
ADMINER_PORT="8081"
STORAGE_DRIVER="local"
STORAGE_BUCKET="personagens"
STORAGE_LOCAL_DIR="./public/uploads"
STORAGE_LOCAL_PUBLIC_URL="/uploads"
NEXT_PUBLIC_STORAGE_MAX_FILE_SIZE_MB="40"
ADMINER_URL="http://localhost:8081"
ENV
  fi

  if has_command openssl; then
    secret="$(openssl rand -hex 32)"
    sed -i.bak "s/^NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$secret\"/" "$env_file"
    rm -f "$env_file.bak"
  fi

  info ".env.docker-local criado."
}

wait_for_postgres() {
  local attempts="${1:-60}"
  local i

  for i in $(seq 1 "$attempts"); do
    if run_compose --env-file .env.docker-local exec -T postgres pg_isready -U meg -d meg_pocket >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  return 1
}

wait_for_app_database() {
  local attempts="${1:-60}"
  local i

  for i in $(seq 1 "$attempts"); do
    if run_compose --env-file .env.docker-local exec -T app wget --spider -q http://localhost:3000/api/health/db >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  return 1
}

wait_for_app_alive() {
  local attempts="${1:-60}"
  local i

  for i in $(seq 1 "$attempts"); do
    if run_compose --env-file .env.docker-local exec -T app wget --spider -q http://localhost:3000/api/health >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  return 1
}

warn_if_database_unavailable() {
  if wait_for_app_database 15; then
    info "Banco conectado via /api/health/db."
    return 0
  fi

  info "O aplicativo iniciou, mas ainda não conseguiu conectar ao banco. Aguarde alguns segundos ou teste /api/health/db."
  info "Status do Postgres:"
  run_compose --env-file .env.docker-local ps postgres || true
  return 0
}

start_optional_adminer() {
  if run_compose up -d adminer; then
    return 0
  fi

  info "Adminer não foi iniciado automaticamente, provavelmente porque a porta 8081 já está em uso."
  info "O M&G Pocket pode continuar funcionando sem o Adminer. Se quiser usar o Adminer do launcher, libere a porta 8081 e clique em Preparar Ambiente novamente."
  return 0
}

cleanup_legacy_app_compose_project() {
  if [ "$(compose_project_name)" = "app" ]; then
    return 0
  fi

  run_compose_project app down --remove-orphans >/dev/null 2>&1 || true
}

stop_compose_project_stack() {
  local project_name="$1"
  local -a compose_args

  compose_args=()
  if [ -f ".env.docker-local" ]; then
    compose_args+=(--env-file .env.docker-local)
  fi
  compose_args+=(down --remove-orphans)

  run_compose_project "$project_name" "${compose_args[@]}"
}

stop_all_project_stacks() {
  local current_project

  current_project="$(compose_project_name)"
  stop_compose_project_stack "$current_project" || fail "não foi possível parar os containers do M&G Pocket."

  if [ "$current_project" != "meg-pocket" ]; then
    stop_compose_project_stack "meg-pocket" >/dev/null 2>&1 || true
  fi

  if [ "$current_project" != "app" ]; then
    stop_compose_project_stack "app" >/dev/null 2>&1 || true
  fi
}

run_project_test_suite() {
  info "Executando testes automatizados do M&G Pocket..."
  info "Esta etapa pode levar alguns minutos na primeira instalação."
  run_compose exec -T app sh -lc 'NODE_ENV=test MEG_E2E_DOCKER=1 MEG_E2E_REUSE_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:all'
  info "Testes automatizados concluídos com sucesso."
}

seed_ready() {
  run_compose --env-file .env.docker-local exec -T postgres psql -U meg -d meg_pocket -tAc "SELECT CASE WHEN to_regclass('\"Classe\"') IS NULL OR to_regclass('\"Raca\"') IS NULL OR to_regclass('\"MagiaCatalog\"') IS NULL OR to_regclass('\"PericiaCatalog\"') IS NULL OR to_regclass('\"Item\"') IS NULL THEN 0 WHEN (SELECT count(*) FROM \"Classe\") > 0 AND (SELECT count(*) FROM \"Raca\") > 0 AND (SELECT count(*) FROM \"MagiaCatalog\") > 0 AND (SELECT count(*) FROM \"PericiaCatalog\") > 0 AND (SELECT count(*) FROM \"Item\") > 0 THEN 1 ELSE 0 END;" 2>/dev/null | tr -d '[:space:]'
}

project_version() {
  local dir="$1"

  if [ -d "$dir/.git" ] && has_command git; then
    git -C "$dir" describe --tags --always --dirty 2>/dev/null && return 0
  fi

  if [ -f "$dir/package.json" ] && has_command node; then
    node -e "const p=require(process.argv[1]); console.log(p.version || 'desconhecida')" "$dir/package.json" 2>/dev/null && return 0
  fi

  printf '%s\n' "desconhecida"
}

json_escape() {
  local value="${1:-}"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/ }"
  value="${value//$'\r'/ }"
  printf '%s' "$value"
}
