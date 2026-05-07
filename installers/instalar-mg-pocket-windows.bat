@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "PROJECT_NAME=meg-pocket"
set "REPO_URL=https://github.com/jvitorn/meg-pocket.git"
set "ZIP_URL=https://github.com/jvitorn/meg-pocket/archive/refs/tags/v1.0.0.zip"
set "ZIP_DIR=meg-pocket-1.0.0"

set "INSTALL_ROOT=%~dp0"
for %%I in ("%INSTALL_ROOT%.") do set "INSTALL_ROOT=%%~fI"
if exist "%INSTALL_ROOT%\..\package.json" if exist "%INSTALL_ROOT%\..\docker-compose.yml" (
  for %%I in ("%INSTALL_ROOT%\..") do set "INSTALL_ROOT=%%~fI"
)

set "PROJECT_DIR=%INSTALL_ROOT%\%PROJECT_NAME%"
set "SEED_MARKER=installers\.seed-inicial-concluido"

echo Instalação fácil do M^&G Pocket
echo.
echo O projeto será instalado na pasta:
echo %INSTALL_ROOT%
echo.

where docker >nul 2>nul
if errorlevel 1 (
  set "FAIL_MESSAGE=Docker não foi encontrado. Instale e abra o Docker Desktop antes de continuar."
  goto fail
)

docker compose version >nul 2>nul
if errorlevel 1 (
  set "FAIL_MESSAGE=Docker Compose não foi encontrado. Atualize o Docker Desktop."
  goto fail
)

docker info >nul 2>nul
if errorlevel 1 (
  set "FAIL_MESSAGE=Docker não está rodando. Abra o Docker Desktop e tente novamente."
  goto fail
)

if exist "%INSTALL_ROOT%\package.json" if exist "%INSTALL_ROOT%\docker-compose.yml" (
  set "PROJECT_DIR=%INSTALL_ROOT%"
  echo Projeto encontrado na pasta atual.
  goto project_ready
)

if exist "%PROJECT_DIR%\docker-compose.yml" (
  echo Projeto já encontrado em %PROJECT_DIR%.
  goto project_ready
)

where git >nul 2>nul
if not errorlevel 1 (
  echo Git encontrado. Baixando o projeto com git clone...
  git clone "%REPO_URL%" "%PROJECT_DIR%"
  if errorlevel 1 (
    set "FAIL_MESSAGE=não foi possível baixar o projeto com Git."
    goto fail
  )
  goto project_ready
)

echo Git não foi encontrado. Baixando o projeto por ZIP...
where powershell >nul 2>nul
if errorlevel 1 (
  set "FAIL_MESSAGE=PowerShell não foi encontrado. Instale Git ou baixe o ZIP manualmente."
  goto fail
)

set "MG_INSTALL_ROOT=%INSTALL_ROOT%"
set "MG_PROJECT_NAME=%PROJECT_NAME%"
set "MG_PROJECT_DIR=%PROJECT_DIR%"
set "MG_ZIP_URL=%ZIP_URL%"
set "MG_ZIP_DIR=%ZIP_DIR%"
set "MG_ZIP_FILE=%INSTALL_ROOT%\meg-pocket-v1.0.0.zip"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri $env:MG_ZIP_URL -OutFile $env:MG_ZIP_FILE; Expand-Archive -Force -Path $env:MG_ZIP_FILE -DestinationPath $env:MG_INSTALL_ROOT; $extracted = Join-Path $env:MG_INSTALL_ROOT $env:MG_ZIP_DIR; if (!(Test-Path $extracted)) { throw 'A pasta esperada do ZIP não foi encontrada.' }; Rename-Item -Path $extracted -NewName $env:MG_PROJECT_NAME; Remove-Item $env:MG_ZIP_FILE"
if errorlevel 1 (
  set "FAIL_MESSAGE=não foi possível baixar ou extrair o ZIP do projeto."
  goto fail
)

:project_ready
cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  set "FAIL_MESSAGE=não foi possível entrar na pasta do projeto."
  goto fail
)

if not exist "storage\local\public" mkdir "storage\local\public"
if not exist "installers" mkdir "installers"

echo.
echo Subindo containers. Isso pode levar alguns minutos na primeira execução...
docker compose up -d --build
if errorlevel 1 (
  set "FAIL_MESSAGE=docker compose up falhou."
  goto fail
)

echo.
echo Aguardando o banco de dados iniciar...
call :wait_db
if errorlevel 1 (
  set "FAIL_MESSAGE=o banco de dados não ficou pronto a tempo."
  goto fail
)

echo.
echo Aplicando migrations e preparando o Prisma...
docker compose exec -T app npm run db:setup
if errorlevel 1 (
  set "FAIL_MESSAGE=não foi possível preparar o banco de dados."
  goto fail
)

call :seed_if_needed
if errorlevel 1 (
  set "FAIL_MESSAGE=não foi possível executar o seed inicial."
  goto fail
)

echo.
echo M^&G Pocket instalado e iniciado.
echo Acesse: http://localhost:3000
echo.
echo Para usar depois da primeira instalação:
echo   installers\iniciar-mg-pocket-windows.bat
echo   installers\parar-mg-pocket-windows.bat
echo.
pause
exit /b 0

:wait_db
for /l %%I in (1,1,60) do (
  docker compose exec -T postgres pg_isready -U meg -d meg_pocket >nul 2>nul
  if not errorlevel 1 exit /b 0
  timeout /t 2 /nobreak >nul
)
exit /b 1

:seed_if_needed
if exist "%SEED_MARKER%" (
  echo.
  echo Seed inicial já foi executado. Pulando seed.
  exit /b 0
)

set "SEED_READY="
for /f "usebackq tokens=* delims=" %%A in (`docker compose exec -T postgres psql -U meg -d meg_pocket -tAc "SELECT CASE WHEN to_regclass('""Classe""') IS NULL OR to_regclass('""Raca""') IS NULL OR to_regclass('""MagiaCatalog""') IS NULL OR to_regclass('""PericiaCatalog""') IS NULL OR to_regclass('""Item""') IS NULL THEN 0 WHEN (SELECT count(*) FROM ""Classe"") > 0 AND (SELECT count(*) FROM ""Raca"") > 0 AND (SELECT count(*) FROM ""MagiaCatalog"") > 0 AND (SELECT count(*) FROM ""PericiaCatalog"") > 0 AND (SELECT count(*) FROM ""Item"") > 0 THEN 1 ELSE 0 END;" 2^>nul`) do set "SEED_READY=%%A"
set "SEED_READY=%SEED_READY: =%"

if "%SEED_READY%"=="1" (
  echo.
  echo Dados essenciais já existem. Pulando seed inicial.
  type nul > "%SEED_MARKER%"
  exit /b 0
)

echo.
echo Executando seed inicial com os dados essenciais do RPG...
docker compose exec -T app npm run db:seed
if errorlevel 1 exit /b 1
type nul > "%SEED_MARKER%"
exit /b 0

:fail
echo.
echo Instalação interrompida: %FAIL_MESSAGE%
echo.
pause
exit /b 1
