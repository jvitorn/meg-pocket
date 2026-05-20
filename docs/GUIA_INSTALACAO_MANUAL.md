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
```

## Preparar Ambiente

```bash
cp .env.example .env.docker-local
mkdir -p storage/local/public
```

## Subir Serviços

```bash
docker compose --env-file .env.docker-local build app
docker compose --env-file .env.docker-local up -d postgres
```

## Banco De Dados

```bash
docker compose --env-file .env.docker-local run --rm --build maintenance npm run db:setup
docker compose --env-file .env.docker-local run --rm --build maintenance npm run db:seed
docker compose --env-file .env.docker-local up -d app nginx
```

## Acessos

Site:

```text
http://localhost:3000
```

Adminer:

```text
http://localhost:8081
```

## Parar Sem Apagar Dados

```bash
docker compose --env-file .env.docker-local stop
```

## Remover Containers Sem Apagar Volumes

```bash
docker compose --env-file .env.docker-local down
```

Não use `docker compose down -v` a menos que queira apagar o banco local.
