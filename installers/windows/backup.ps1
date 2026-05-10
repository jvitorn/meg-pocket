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
$stamp = Get-Date -Format "yyyy-MM-dd-HH-mm"
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("mg-pocket-backup-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$backupFile = Join-Path $backupDir "mg-pocket-backup-$stamp.zip"

Invoke-Compose @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "pg_dump", "-U", "meg", "-d", "meg_pocket") > (Join-Path $tmp "postgres.sql")

if (Test-Path ".env.docker-local") {
  Copy-Item ".env.docker-local" (Join-Path $tmp "env.docker-local")
}

if (Test-Path "storage\local\public") {
  New-Item -ItemType Directory -Force -Path (Join-Path $tmp "storage\local") | Out-Null
  Copy-Item -Recurse "storage\local\public" (Join-Path $tmp "storage\local\public")
}

Compress-Archive -Path (Join-Path $tmp "*") -DestinationPath $backupFile -Force
Remove-Item -Recurse -Force $tmp
Write-Host $backupFile
