@echo off
setlocal EnableExtensions
chcp 65001 >nul

cd /d "%~dp0.."
if errorlevel 1 (
  echo Não foi possível entrar na pasta do projeto.
  pause
  exit /b 1
)

docker compose down
if errorlevel 1 (
  echo Não foi possível desligar o M^&G Pocket.
  pause
  exit /b 1
)

echo.
echo M^&G Pocket desligado.
echo Seus dados locais foram mantidos.
echo.
pause
