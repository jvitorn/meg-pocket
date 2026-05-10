@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "MG_POCKET_PROJECT_DIR=%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\start.ps1"
if errorlevel 1 (
  echo.
  echo Não foi possível iniciar o M^&G Pocket.
  pause
  exit /b 1
)

pause
