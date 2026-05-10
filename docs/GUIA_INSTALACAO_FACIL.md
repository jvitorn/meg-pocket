# Guia de Instalação Fácil — M&G Pocket

Este guia é para rodar o M&G Pocket no próprio computador sem configurar ambiente de programação.

## Opção Recomendada: Launcher Visual

1. Acesse a página de Releases do GitHub.
2. Baixe o M&G Pocket Launcher para seu sistema.
3. Abra o launcher.
4. Clique em **Preparar ambiente**.
5. No Linux, se Docker não estiver instalado, o launcher poderá instalar automaticamente em distros suportadas.
6. Aguarde o processo terminar.
7. Clique em **Abrir Site**.

O launcher prepara Docker, projeto local, banco, migrations, seed inicial e serviços Docker Compose.

## Linux Com Download Rápido

```bash
curl -fsSL https://raw.githubusercontent.com/jvitorn/meg-pocket/master/installers/bootstrap/linux.sh | bash
```

Esse comando baixa e abre o launcher. A instalação do Docker e do M&G Pocket será feita dentro do launcher.

O bootstrap não instala Docker, não baixa o projeto web e não roda Docker Compose.

## Linux Suportado Automaticamente

- Ubuntu
- Debian
- derivados de Ubuntu/Debian
- Arch Linux
- Manjaro
- EndeavourOS
- derivados de Arch

Outras distros exigem instalação manual do Docker. Depois de instalar Docker manualmente, volte ao launcher e clique em **Preparar ambiente**.

## Windows

No Windows, instale o Docker Desktop primeiro:

```text
https://www.docker.com/products/docker-desktop/
```

Depois baixe o instalador `.exe` do M&G Pocket Launcher pela página de Releases.

O launcher no Windows detecta Docker Desktop e, quando ele estiver rodando, permite preparar, iniciar, parar, reiniciar e ver logs do projeto.

## Onde Ficam Os Arquivos

Projeto web no Linux:

```text
~/.local/share/mg-pocket/app
```

Configurações:

```text
~/.config/mg-pocket
```

Backups:

```text
~/Documentos/MG Pocket/backups
```

Se `~/Documentos` não existir, o launcher usa `~/Documents/MG Pocket/backups`. Se essa pasta também não existir, usa `~/.local/share/mg-pocket/backups`.

## Instalação Manual Avançada

Para desenvolvedores:

```bash
git clone https://github.com/jvitorn/meg-pocket.git
cd meg-pocket
cp .env.example .env.docker-local
docker compose --env-file .env.docker-local up -d --build
docker compose --env-file .env.docker-local exec -T app npm run db:setup
docker compose --env-file .env.docker-local exec -T app npm run db:seed
```

Acesse:

```text
http://localhost:3000
```

Adminer:

```text
http://localhost:8081
```

## Scripts Antigos

Os scripts antigos em `installers/` foram mantidos como wrappers de compatibilidade.

- `instalar-mg-pocket-linux-mac.sh` agora abre o fluxo do launcher no Linux.
- `iniciar-mg-pocket-linux-mac.sh` chama `installers/linux/start.sh`.
- `parar-mg-pocket-linux-mac.sh` chama `installers/linux/stop.sh`.
- Os `.bat` do Windows chamam os scripts PowerShell novos.
