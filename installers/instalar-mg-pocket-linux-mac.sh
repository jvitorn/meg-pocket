#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="meg-pocket"
REPO_URL="https://github.com/jvitorn/meg-pocket.git"
ZIP_URL="https://github.com/jvitorn/meg-pocket/archive/refs/tags/v1.0.0.zip"
ZIP_DIR="meg-pocket-1.0.0"

INSTALL_ROOT="$(pwd)"
if [ "$(basename "$INSTALL_ROOT")" = "installers" ] \
  && [ -f "$INSTALL_ROOT/../package.json" ] \
  && [ -f "$INSTALL_ROOT/../docker-compose.yml" ]; then
  INSTALL_ROOT="$(cd "$INSTALL_ROOT/.." && pwd)"
fi

PROJECT_DIR="$INSTALL_ROOT/$PROJECT_NAME"
SEED_MARKER="installers/.seed-inicial-concluido"

fail() {
  echo
  echo "Instalação interrompida: $1"
  exit 1
}

has_command() {
  command -v "$1" >/dev/null 2>&1
}

echo "Instalação fácil do M&G Pocket"
echo
echo "O projeto será instalado na pasta:"
echo "$INSTALL_ROOT"
echo

has_command docker || fail "Docker não foi encontrado. Instale e abra o Docker Desktop antes de continuar."
docker compose version >/dev/null 2>&1 || fail "Docker Compose não foi encontrado. Atualize o Docker Desktop ou instale o plugin do Compose."
docker info >/dev/null 2>&1 || fail "Docker não está rodando. Abra o Docker Desktop e tente novamente."

if [ -f "$INSTALL_ROOT/package.json" ] && [ -f "$INSTALL_ROOT/docker-compose.yml" ]; then
  PROJECT_DIR="$INSTALL_ROOT"
  echo "Projeto encontrado na pasta atual."
elif [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
  echo "Projeto já encontrado em $PROJECT_DIR."
else
  if has_command git; then
    echo "Git encontrado. Baixando o projeto com git clone..."
    git clone "$REPO_URL" "$PROJECT_DIR" || fail "não foi possível baixar o projeto com Git."
  else
    echo "Git não foi encontrado. Baixando o projeto por ZIP..."

    has_command unzip || fail "o comando unzip não foi encontrado. Instale unzip e rode o instalador novamente."

    ZIP_FILE="$INSTALL_ROOT/meg-pocket-v1.0.0.zip"
    if has_command curl; then
      curl -L "$ZIP_URL" -o "$ZIP_FILE" || fail "não foi possível baixar o ZIP do projeto."
    elif has_command wget; then
      wget -O "$ZIP_FILE" "$ZIP_URL" || fail "não foi possível baixar o ZIP do projeto."
    else
      fail "curl ou wget não foram encontrados. Instale um deles para usar o fallback por ZIP."
    fi

    unzip -q "$ZIP_FILE" -d "$INSTALL_ROOT" || fail "não foi possível extrair o ZIP do projeto."
    [ -d "$INSTALL_ROOT/$ZIP_DIR" ] || fail "a pasta esperada do ZIP não foi encontrada: $ZIP_DIR."
    mv "$INSTALL_ROOT/$ZIP_DIR" "$PROJECT_DIR" || fail "não foi possível preparar a pasta do projeto."
    rm -f "$ZIP_FILE"
  fi
fi

cd "$PROJECT_DIR" || fail "não foi possível entrar na pasta do projeto."
mkdir -p storage/local/public installers

echo
echo "Subindo containers. Isso pode levar alguns minutos na primeira execução..."
docker compose up -d --build || fail "docker compose up falhou."

echo
echo "Aguardando o banco de dados iniciar..."
for _ in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U meg -d meg_pocket >/dev/null 2>&1; then
    DB_READY=1
    break
  fi
  sleep 2
done

[ "${DB_READY:-0}" = "1" ] || fail "o banco de dados não ficou pronto a tempo."

echo
echo "Aplicando migrations e preparando o Prisma..."
docker compose exec -T app npm run db:setup || fail "não foi possível preparar o banco de dados."

seed_ready="$(docker compose exec -T postgres psql -U meg -d meg_pocket -tAc "SELECT CASE WHEN to_regclass('\"Classe\"') IS NULL OR to_regclass('\"Raca\"') IS NULL OR to_regclass('\"MagiaCatalog\"') IS NULL OR to_regclass('\"PericiaCatalog\"') IS NULL OR to_regclass('\"Item\"') IS NULL THEN 0 WHEN (SELECT count(*) FROM \"Classe\") > 0 AND (SELECT count(*) FROM \"Raca\") > 0 AND (SELECT count(*) FROM \"MagiaCatalog\") > 0 AND (SELECT count(*) FROM \"PericiaCatalog\") > 0 AND (SELECT count(*) FROM \"Item\") > 0 THEN 1 ELSE 0 END;" 2>/dev/null | tr -d '[:space:]' || true)"

if [ -f "$SEED_MARKER" ] || [ "$seed_ready" = "1" ]; then
  echo
  echo "Seed inicial já foi executado ou dados essenciais já existem. Pulando seed."
  touch "$SEED_MARKER"
else
  echo
  echo "Executando seed inicial com os dados essenciais do RPG..."
  docker compose exec -T app npm run db:seed || fail "não foi possível executar o seed inicial."
  touch "$SEED_MARKER"
fi

echo
echo "M&G Pocket instalado e iniciado."
echo "Acesse: http://localhost:3000"
echo
echo "Para usar depois da primeira instalação:"
echo "  ./installers/iniciar-mg-pocket-linux-mac.sh"
echo "  ./installers/parar-mg-pocket-linux-mac.sh"
