@echo off
setlocal EnableExtensions
chcp 65001 >nul

echo Este script foi migrado para o fluxo v1.1.
echo Ele abre a página de Releases para baixar o M^&G Pocket Launcher.
echo A instalação acontece pela interface visual.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bootstrap\windows.ps1"
if errorlevel 1 pause
