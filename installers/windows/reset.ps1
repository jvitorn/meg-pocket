. "$PSScriptRoot\lib.ps1"

$confirmed = $args[0]
$skipBackup = $args[1]

if ($confirmed -ne "--yes") {
  $answer = Read-Host "Digite RESETAR para apagar banco e storage locais"
  if ($answer -ne "RESETAR") {
    throw "Reset cancelado."
  }
}

Ensure-DockerReady
$projectDir = Get-MgProjectDir
if (-not (Test-Path (Join-Path $projectDir "docker-compose.yml"))) {
  throw "Projeto não encontrado em $projectDir."
}

if ($skipBackup -ne "--skip-backup") {
  try {
    & "$PSScriptRoot\backup.ps1"
  } catch {
    Write-Host "Backup automático falhou. Continuando porque o reset foi confirmado explicitamente."
  }
}

Set-Location $projectDir
Invoke-Compose @("--env-file", ".env.docker-local", "down", "-v")
Remove-Item -Recurse -Force "storage\local\public" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "storage\local\public" | Out-Null
Remove-Item -Recurse -Force "public\uploads" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "public\uploads" | Out-Null
Remove-Item "installers\.seed-inicial-concluido" -Force -ErrorAction SilentlyContinue

& "$PSScriptRoot\install-project.ps1"
Write-Host "Dados locais resetados."
