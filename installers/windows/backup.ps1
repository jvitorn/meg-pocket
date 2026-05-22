. "$PSScriptRoot\lib.ps1"

Ensure-DockerReady
$projectDir = Get-MgProjectDir
if (-not (Test-Path (Join-Path $projectDir "docker-compose.yml"))) {
  throw "Projeto não encontrado em $projectDir."
}

Set-Location $projectDir
Ensure-EnvFile $projectDir
Invoke-Compose @("--env-file", ".env.docker-local", "up", "-d", "postgres")
Wait-Postgres

$backupDir = Get-MgBackupDir
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$backupFile = Join-Path $backupDir "meg-pocket-db-$stamp.sql"

Invoke-Compose @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "pg_dump", "-U", "meg", "-d", "meg_pocket") > $backupFile
Write-Host $backupFile
