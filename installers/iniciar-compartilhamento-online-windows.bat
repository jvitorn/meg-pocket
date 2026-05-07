@echo off
setlocal EnableExtensions
chcp 65001 >nul

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared não foi encontrado.
  echo Instale o Cloudflare Tunnel antes de usar este compartilhamento opcional.
  echo A instalação principal do M^&G Pocket funciona normalmente sem ele.
  pause
  exit /b 1
)

cd /d "%~dp0.."
if errorlevel 1 (
  echo Não foi possível entrar na pasta do projeto.
  pause
  exit /b 1
)

echo Compartilhamento online opcional do M^&G Pocket
echo.
echo Atenção: o link gerado ficará público na internet enquanto o túnel estiver ligado.
echo Compartilhe apenas com os jogadores da sua mesa.
echo Somente http://localhost:3000 será exposto. Banco, Adminer e storage interno não serão expostos.
echo.

docker compose up -d app
if errorlevel 1 (
  echo Não foi possível iniciar a aplicação antes do túnel.
  pause
  exit /b 1
)

echo Uma nova janela será aberta com o Cloudflare Tunnel.
echo Copie o link https://...trycloudflare.com exibido nessa janela e envie apenas para sua mesa.
echo.

start "M&G Pocket - Compartilhamento Online" cmd /k "cloudflared tunnel --url http://localhost:3000"

echo Compartilhamento online iniciado.
echo Para desligar, feche a janela do Cloudflare Tunnel ou rode:
echo installers\parar-compartilhamento-online-windows.bat
echo.
pause
