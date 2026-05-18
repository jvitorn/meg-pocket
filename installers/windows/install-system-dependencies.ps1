. "$PSScriptRoot\lib.ps1"

if (-not (Test-Command "winget")) {
  throw "winget não foi encontrado. Instale ou atualize o App Installer pela Microsoft Store."
}

$planned = @()
if (-not (Test-Command "git")) {
  $planned += @{ Name = "Git for Windows"; Command = "winget install -e --id Git.Git" }
}

if (-not (Test-DockerDesktopInstalled)) {
  $planned += @{ Name = "Docker Desktop"; Command = "winget install -e --id Docker.DockerDesktop" }
}

if ($planned.Count -eq 0) {
  Write-Host "Nenhuma dependência instalável pelo winget está ausente."
  exit 0
}

$logDir = Get-MgLauncherLogDir
$logFile = Join-Path $logDir ("admin-winget-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$adminScript = Join-Path ([IO.Path]::GetTempPath()) ("mg-pocket-winget-{0}.ps1" -f ([Guid]::NewGuid().ToString("N")))

$commandLines = ($planned | ForEach-Object { $_.Command }) -join "`r`n"
$friendlyList = ($planned | ForEach-Object { "- " + $_.Name }) -join "`r`n"

@"
`$ErrorActionPreference = "Continue"
`$failed = `$false
Start-Transcript -Path "$logFile" -Append
Write-Host "M&G Pocket Launcher"
Write-Host ""
Write-Host "Etapa: Instalação de dependências do Windows"
Write-Host ""
Write-Host "Dependências que serão instaladas:"
Write-Host @'
$friendlyList
'@
Write-Host ""
Write-Host "Comandos que serão executados:"
Write-Host @'
$commandLines
'@
Write-Host ""
Write-Host "Se o Windows pedir permissão, confirme pela janela do sistema."
Write-Host ""
$(($planned | ForEach-Object {
  "Write-Host `"Executando: $($_.Command)`"`r`n$($_.Command)`r`nif (`$LASTEXITCODE -ne 0) { `$failed = `$true }"
}) -join "`r`n")
Write-Host ""
if (`$failed) {
  Write-Host "Falha ao instalar uma ou mais dependências. Veja o log técnico em: $logFile"
  Stop-Transcript
  Read-Host "Pressione Enter para fechar"
  exit 1
}
Write-Host "Dependências instaladas ou já disponíveis."
Write-Host "Se o Docker Desktop foi instalado agora, abra o Docker Desktop e aguarde o Docker Engine iniciar."
Write-Host "Se o Windows solicitar reinicialização, reinicie antes de voltar ao launcher."
Stop-Transcript
Read-Host "Pressione Enter para fechar"
exit 0
"@ | Set-Content -Path $adminScript -Encoding UTF8

Write-Host "Abrindo PowerShell elevado para instalar dependências pelo winget."
Write-Host "Log técnico: $logFile"

$process = Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $adminScript
) -Verb RunAs -Wait -PassThru

try {
  Remove-Item -Force $adminScript -ErrorAction SilentlyContinue
} catch {}

if ($process.ExitCode -ne 0) {
  if (Test-Path $logFile) {
    Get-Content $logFile -Tail 120
  }
  throw "A instalação elevada de dependências falhou ou foi cancelada."
}

if (Test-Path $logFile) {
  Get-Content $logFile -Tail 120
}

Write-Host "Valide o Git e abra o Docker Desktop se ele foi instalado agora."
