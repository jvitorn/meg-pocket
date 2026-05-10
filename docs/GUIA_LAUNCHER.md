# Guia do Launcher — M&G Pocket

O M&G Pocket Launcher é a forma recomendada de instalar e operar o M&G Pocket localmente.

Ele fica em `launcher/` no mesmo repositório do projeto web e usa os scripts em `installers/` para diagnosticar, preparar Docker, baixar o projeto, subir containers, ver logs, criar backups e resetar dados locais.

## O Que O Launcher Faz

- Diagnostica sistema operacional, distro Linux, Docker, Docker Compose e permissões.
- Instala Docker automaticamente em Ubuntu/Debian-based e Arch-based.
- Inicia o serviço Docker no Linux quando necessário.
- Ajusta o usuário para o grupo `docker` quando necessário.
- Baixa ou atualiza o projeto em `~/.local/share/mg-pocket/app`.
- Cria `.env.docker-local` sem sobrescrever um arquivo existente.
- Sobe o projeto com Docker Compose.
- Aplica migrations e seed inicial.
- Abre o site em `http://localhost:3000`.
- Abre o Adminer em `http://localhost:8081`.
- Exibe logs, para, reinicia, cria backup, restaura backup e reseta dados locais com confirmação.

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

Se o usuário for adicionado ao grupo `docker`, talvez seja necessário sair e entrar novamente na sessão. A primeira instalação pode continuar usando `sudo docker compose`.

## Windows

Na v1.1, o launcher não instala Docker Desktop automaticamente.

Se Docker não existir, o launcher mostra a orientação para instalar Docker Desktop e oferece um botão para abrir a página oficial.

Com Docker Desktop instalado e rodando, o launcher pode preparar, iniciar, parar, reiniciar e ler logs do projeto.

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

## Segurança

- O launcher não salva senha.
- A senha de `sudo`, quando necessária, é solicitada pelo sistema.
- O frontend chama apenas comandos Tauri específicos.
- Não existe execução arbitrária de shell pela interface.
- Reset e restore exigem confirmação.
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
```

Windows:

```text
installers/windows/doctor.ps1
installers/windows/install-project.ps1
installers/windows/start.ps1
installers/windows/stop.ps1
installers/windows/restart.ps1
installers/windows/logs.ps1
installers/windows/open-docker-guide.ps1
```

## Fora Do Escopo Da v1.1

- Cloudflare Tunnel.
- URL pública de campanha.
- Auto-update completo do launcher.
- Instalação automática do Docker Desktop no Windows.
- Suporte automático para Fedora/openSUSE.
- Empacotamento final completo para todas as plataformas.
