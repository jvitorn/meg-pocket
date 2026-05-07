@echo off
setlocal EnableExtensions
chcp 65001 >nul

tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I "cloudflared.exe" >NUL
if errorlevel 1 (
  echo Nenhum processo cloudflared.exe foi encontrado.
  echo O compartilhamento online já parece estar desligado.
  pause
  exit /b 0
)

echo Este comando encerra processos cloudflared.exe em execução neste computador.
echo Use apenas se você iniciou o compartilhamento online do M^&G Pocket.
echo.
choice /C SN /M "Deseja continuar"
if errorlevel 2 (
  echo Operação cancelada.
  pause
  exit /b 0
)

taskkill /IM cloudflared.exe /F
if errorlevel 1 (
  echo Não foi possível encerrar o cloudflared.exe.
  pause
  exit /b 1
)

echo Compartilhamento online desligado.
echo O link temporário deixou de funcionar.
pause
