@echo off
setlocal EnableExtensions
chcp 65001 >nul

cd /d "%~dp0.."
if errorlevel 1 (
  echo Não foi possível entrar na pasta do projeto.
  pause
  exit /b 1
)

if not exist "storage\local\public" mkdir "storage\local\public"

docker compose up -d
if errorlevel 1 (
  echo Não foi possível iniciar o M^&G Pocket.
  pause
  exit /b 1
)

echo.
echo M^&G Pocket iniciado.
echo Acesse: http://localhost:3000
echo.
pause
