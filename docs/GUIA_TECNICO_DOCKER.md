# Guia Técnico Docker — M&G Pocket

Este guia concentra os detalhes técnicos do ambiente Docker do M&G Pocket.

## Arquitetura

Serviços principais:

- `app`: aplicação Next.js em modo standalone.
- `maintenance`: imagem auxiliar para Prisma, migrations, seed, backup e restauração do banco.
- `postgres`: banco PostgreSQL local.
- `nginx`: entrada local em `http://localhost:${APP_PORT:-3000}`.
- `adminer`: interface opcional para inspeção do banco.

Volumes:

- `postgres_data`: dados do PostgreSQL.
- `uploads_data`: uploads servidos pela aplicação.

## Imagens Prontas

O compose padrão usa imagens publicadas no GHCR:

```text
ghcr.io/jvitorn/meg-pocket-app:${MEG_POCKET_VERSION:-latest}
ghcr.io/jvitorn/meg-pocket-maintenance:${MEG_POCKET_VERSION:-latest}
```

Targets do `Dockerfile`:

```text
runner       -> meg-pocket-app
maintenance  -> meg-pocket-maintenance
```

O build das imagens prontas usa:

```text
NEXT_REACT_COMPILER=false
```

## Fluxo Padrão

```bash
docker compose --env-file .env.docker-local pull app maintenance
docker compose --env-file .env.docker-local up -d postgres
docker compose --env-file .env.docker-local run --rm maintenance npm run db:setup
docker compose --env-file .env.docker-local run --rm maintenance npm run db:seed
docker compose --env-file .env.docker-local up -d app nginx
```

## Build Local Avançado

Arquivo:

```text
docker-compose.local-build.yml
```

Uso:

```bash
docker compose -f docker-compose.yml -f docker-compose.local-build.yml --env-file .env.docker-local build app maintenance
docker compose --env-file .env.docker-local up -d
```

Sem cache:

```bash
docker compose -f docker-compose.yml -f docker-compose.local-build.yml --env-file .env.docker-local build --no-cache app maintenance
```

## Portas

- `APP_PORT`, padrão `3000`.
- `ADMINER_PORT`, padrão `8081`.
- `POSTGRES_PORT`, padrão `5433` no host.

As portas do compose ficam presas em `127.0.0.1`.

## Healthchecks

- App: `/api/health`.
- Banco via app: `/api/health/db`.
- Nginx: `/healthz`.
- Postgres: `pg_isready`.

## Diagnóstico

Comandos úteis:

```bash
docker compose --env-file .env.docker-local ps -a
docker compose --env-file .env.docker-local logs --tail=200 app
docker compose --env-file .env.docker-local logs --tail=200 postgres
docker compose --env-file .env.docker-local logs --tail=200 nginx
docker compose --env-file .env.docker-local exec -T postgres pg_isready -U meg -d meg_pocket
```

Versão local:

```bash
git describe --tags --always --dirty
```

Versão das imagens:

```bash
docker compose --env-file .env.docker-local images app maintenance
```

## Backup E Restauração Do Banco

Backup SQL:

```bash
mkdir -p "$HOME/Documentos/MG Pocket/backups"
docker compose --env-file .env.docker-local up -d postgres
docker compose --env-file .env.docker-local exec -T postgres pg_dump -U meg -d meg_pocket > "$HOME/Documentos/MG Pocket/backups/meg-pocket-db-$(date +%Y-%m-%d-%H%M).sql"
```

Restauração SQL:

```bash
docker compose --env-file .env.docker-local stop app adminer nginx
docker compose --env-file .env.docker-local up -d postgres
docker compose --env-file .env.docker-local exec -T postgres psql -U meg -d meg_pocket -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose --env-file .env.docker-local exec -T postgres psql -U meg -d meg_pocket < meg-pocket-db-YYYY-MM-DD-HHmm.sql
docker compose --env-file .env.docker-local up -d app nginx
```

## GitHub Actions

Workflow das imagens:

```text
.github/workflows/docker-images.yml
```

Tags publicadas:

```text
latest
sha-<commit-curto>
vX.Y.Z
```

O workflow usa Buildx e cache do GitHub Actions:

```text
cache-from: type=gha
cache-to: type=gha,mode=max
```
