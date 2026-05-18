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

## Linux — AppImage Abriu Em Branco

Em alguns ambientes Linux com Wayland/WebKitGTK, o AppImage pode abrir em branco.

Teste pelo terminal:

```bash
WEBKIT_DISABLE_COMPOSITING_MODE=1 ./mg-pocket-launcher_1.1.0_amd64.AppImage
```

Se continuar:

```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 ./mg-pocket-launcher_1.1.0_amd64.AppImage
```

Ou:

```bash
GDK_BACKEND=x11 WEBKIT_DISABLE_COMPOSITING_MODE=1 ./mg-pocket-launcher_1.1.0_amd64.AppImage
```

No Arch Linux, garanta dependências comuns:

```bash
sudo pacman -S webkit2gtk-4.1 gtk3 glib2 libayatana-appindicator librsvg fuse2
```

## Windows

Baixe o instalador `.exe` do M&G Pocket Launcher pela página de Releases.

No Windows, o launcher detecta `winget`, Git for Windows, Docker Desktop, Docker CLI, Docker Compose, PowerShell e WSL2 quando necessário.

Se Git ou Docker Desktop estiverem ausentes e `winget` existir, o launcher oferece instalação guiada com confirmação:

```powershell
winget install -e --id Git.Git
winget install -e --id Docker.DockerDesktop
```

Depois de instalar Docker Desktop, abra o Docker Desktop e aguarde o Docker Engine iniciar. Se o Windows pedir reinicialização, reinicie antes de voltar ao launcher.

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

- `instalar-mg-pocket-linux-mac.sh` agora abre o fluxo do launcher no Linux; macOS não tem artefatos publicados nesta fase.
- `iniciar-mg-pocket-linux-mac.sh` chama `installers/linux/start.sh` no Linux.
- `parar-mg-pocket-linux-mac.sh` chama `installers/linux/stop.sh` no Linux.
- Os `.bat` do Windows chamam os scripts PowerShell novos.
