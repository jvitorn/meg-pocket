# Installers M&G Pocket

Esta pasta separa o fluxo v1.1 em bootstrap, scripts Linux, scripts Windows e documentação compartilhada.

## Bootstrap

```text
installers/bootstrap/linux.sh
installers/bootstrap/windows.ps1
```

O bootstrap só baixa e abre o launcher.

Ele não instala Docker, não baixa o projeto web e não executa Docker Compose.

## Linux

Scripts operacionais:

```text
doctor.sh
detect-distro.sh
install-docker.sh
install-docker-arch.sh
install-docker-ubuntu.sh
ensure-docker-running.sh
ensure-docker-permission.sh
install-project.sh
start.sh
stop.sh
restart.sh
logs.sh
backup.sh
restore.sh
reset.sh
```

Todos usam `lib.sh` para resolver diretórios locais, comando Docker Compose e helpers comuns.

O comando Compose é escolhido nesta ordem:

```text
docker compose
docker-compose
sudo docker compose
sudo docker-compose
```

## Windows

Scripts funcionais, mas guiados:

```text
doctor.ps1
install-project.ps1
start.ps1
stop.ps1
restart.ps1
logs.ps1
open-docker-guide.ps1
```

Na v1.1, Docker Desktop deve ser instalado manualmente no Windows.

## Compatibilidade

Os scripts antigos no topo de `installers/` foram mantidos como wrappers:

```text
instalar-mg-pocket-linux-mac.sh
iniciar-mg-pocket-linux-mac.sh
parar-mg-pocket-linux-mac.sh
instalar-mg-pocket-windows.bat
iniciar-mg-pocket-windows.bat
parar-mg-pocket-windows.bat
```

## Testes

```bash
installers/tests/test-detect-distro.sh
installers/tests/test-compose-helper.sh
installers/tests/test-doctor-output.sh
```

Se `shellcheck` estiver disponível:

```bash
shellcheck installers/linux/*.sh installers/bootstrap/*.sh installers/tests/*.sh
```
