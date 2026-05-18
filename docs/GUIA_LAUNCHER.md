# Guia do Launcher — M&G Pocket

O M&G Pocket Launcher é a forma recomendada de instalar e operar o M&G Pocket localmente.

Ele fica em `launcher/` no mesmo repositório do projeto web e usa os scripts em `installers/` para diagnosticar, preparar Docker, baixar o projeto, subir containers, ver logs, criar backups e resetar dados locais.

## O Que O Launcher Faz

- Diagnostica sistema operacional, distro Linux, Docker, Docker Compose e permissões.
- Instala Docker automaticamente em Ubuntu/Debian-based e Arch-based.
- Inicia o serviço Docker no Linux quando necessário.
- Ajusta o usuário para o grupo `docker` quando necessário.
- No Windows, detecta `winget` e pode instalar Git for Windows e Docker Desktop com confirmação.
- Baixa ou atualiza o projeto em `~/.local/share/mg-pocket/app`.
- Cria `.env.docker-local` sem sobrescrever um arquivo existente.
- Sobe o projeto com Docker Compose.
- Aplica migrations e seed inicial.
- Abre o site em `http://localhost:3000`.
- Abre o Adminer em `http://localhost:8081`.
- Exibe logs, para, reinicia, cria backup, restaura backup, remove o projeto local e reseta dados locais com confirmação.

## Diretórios Locais

Projeto web:

```text
~/.local/share/mg-pocket/app
```

Launcher/bootstrap:

```text
~/.local/share/mg-pocket-launcher
```

Scripts embutidos em execução empacotada:

```text
~/.local/share/mg-pocket-launcher/installers
```

Configurações:

```text
~/.config/mg-pocket
```

Backups:

```text
~/Documentos/MG Pocket/backups
```

Fallbacks de backup:

```text
~/Documents/MG Pocket/backups
~/.local/share/mg-pocket/backups
```

## Linux

O botão **Preparar ambiente** executa o fluxo:

1. Diagnóstico.
2. Instalação do Docker, se necessário e se a distro for suportada.
3. Inicialização do serviço Docker.
4. Verificação de Docker Compose.
5. Ajuste de permissão do usuário no grupo `docker`.
6. Download ou atualização do projeto.
7. `docker compose --env-file .env.docker-local up -d --build`.
8. Espera do Postgres.
9. Migrations e seed.
10. Validação de `http://localhost:3000`.

Se o usuário for adicionado ao grupo `docker`, é necessário sair e entrar novamente na sessão do Linux. O launcher mostra uma decisão explícita: sair/entrar depois ou continuar temporariamente usando `sudo` nesta sessão. Ele não reinicia sua sessão automaticamente.

## Windows

No Windows, o launcher detecta `winget`, Git for Windows, Docker Desktop, Docker CLI, Docker Compose, PowerShell e WSL2 quando necessário.

Se Git ou Docker Desktop estiverem ausentes e `winget` existir, o launcher oferece instalação guiada com confirmação:

```powershell
winget install -e --id Git.Git
winget install -e --id Docker.DockerDesktop
```

Depois de instalar Docker Desktop, abra o Docker Desktop e aguarde o Docker Engine iniciar. Se o Windows pedir reinicialização, reinicie antes de voltar ao launcher.

## Logs

O botão **Ver Logs** lê um snapshot equivalente a:

```bash
docker compose --env-file .env.docker-local logs --tail=200
```

Para acompanhar logs em terminal:

```bash
installers/linux/logs.sh --follow
```

## Backup

O backup exporta:

- dump do banco Postgres;
- `.env.docker-local`;
- storage local em `storage/local/public`, quando existir.

Nome no Linux:

```text
mg-pocket-backup-YYYY-MM-DD-HH-mm.tar.gz
```

## Reset

Reset local exige confirmação explícita.

No launcher, confirme a ação digitando `RESETAR`. No terminal, o script também pede confirmação, a menos que seja chamado com `--yes`.

O reset tenta criar backup antes de apagar volumes e storage locais.

## Remoção Local

O botão **Remover Projeto Local** para containers e remove a pasta local do projeto, preservando volumes Docker quando possível.

O botão **Desinstalar M&G Pocket Local** também remove containers, volumes e redes do projeto. Essa ação exige confirmação digitando `REMOVER`.

Docker, Git, winget e dependências globais nunca são removidos pelo launcher.

## Segurança

- O launcher não salva senha.
- A senha de `sudo` ou administrador, quando necessária, é solicitada pelo sistema ou por um terminal externo claro.
- O frontend chama apenas comandos Tauri específicos.
- Não existe execução arbitrária de shell pela interface.
- Reset, restore e remoção completa exigem confirmação.
- `.env.docker-local` não é sobrescrito sem confirmação.
- As portas do compose continuam presas em `127.0.0.1`.

## Desenvolvimento Do Launcher

Pré-requisitos:

- Node.js 22;
- npm 10;
- Rust estável;
- dependências Linux do Tauri/WebKitGTK, quando rodar no Linux.

Modo dev:

```bash
cd launcher
npm install
npm run tauri dev
```

Build:

```bash
cd launcher
npm run fix:icons
npm run build
npm run tauri:build
```

Testes:

```bash
cd launcher
npm test
```

## Scripts Principais

Linux:

```text
installers/linux/doctor.sh
installers/linux/install-docker.sh
installers/linux/install-project.sh
installers/linux/start.sh
installers/linux/stop.sh
installers/linux/restart.sh
installers/linux/logs.sh
installers/linux/backup.sh
installers/linux/restore.sh
installers/linux/reset.sh
installers/linux/remove-local-project.sh
```

Windows:

```text
installers/windows/doctor.ps1
installers/windows/install-project.ps1
installers/windows/start.ps1
installers/windows/stop.ps1
installers/windows/restart.ps1
installers/windows/logs.ps1
installers/windows/install-system-dependencies.ps1
installers/windows/remove-local-project.ps1
installers/windows/open-docker-guide.ps1
```

## Fora Do Escopo Da v1.1

- Cloudflare Tunnel.
- URL pública de campanha.
- Auto-update completo do launcher.
- Build e publicação de artefatos macOS enquanto macOS não estiver testável.
- Suporte automático para Fedora/openSUSE.
- Empacotamento final completo para plataformas fora de Windows e Linux.
