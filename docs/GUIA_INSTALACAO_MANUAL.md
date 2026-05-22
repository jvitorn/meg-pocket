# Guia de Instalação Manual — M&G Pocket

Use este guia apenas se não quiser usar o M&G Pocket Launcher.

## Pré-requisitos

- Docker Engine ou Docker Desktop.
- Docker Compose, preferencialmente o plugin `docker compose`.
- Git.

## Clonar Projeto

```bash
git clone https://github.com/jvitorn/meg-pocket.git
cd meg-pocket
cp .env.example .env.docker-local
mkdir -p storage/local/public public/uploads
```

## Modo Recomendado Manual

Este modo usa a versão pronta do M&G Pocket.

```bash
docker compose --env-file .env.docker-local pull app maintenance
docker compose --env-file .env.docker-local up -d postgres
docker compose --env-file .env.docker-local run --rm maintenance npm run db:setup
docker compose --env-file .env.docker-local run --rm maintenance npm run db:seed
docker compose --env-file .env.docker-local up -d app nginx
```

Acesse:

```text
http://localhost:3000
```

## Modo Avançado Com Build Local

Use apenas para desenvolvimento, debug ou reparo avançado.

```bash
docker compose -f docker-compose.yml -f docker-compose.local-build.yml --env-file .env.docker-local build app maintenance
docker compose --env-file .env.docker-local up -d postgres
docker compose --env-file .env.docker-local run --rm maintenance npm run db:setup
docker compose --env-file .env.docker-local run --rm maintenance npm run db:seed
docker compose --env-file .env.docker-local up -d app nginx
```

Para rebuild sem cache:

```bash
docker compose -f docker-compose.yml -f docker-compose.local-build.yml --env-file .env.docker-local build --no-cache app maintenance
```

## Parar Sem Apagar Dados

```bash
docker compose --env-file .env.docker-local stop
```

## Remover Sem Apagar Dados Persistentes

```bash
docker compose --env-file .env.docker-local down
```

Não use `docker compose down -v` a menos que queira apagar o banco local.
