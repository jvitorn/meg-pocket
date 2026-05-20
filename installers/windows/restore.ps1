. "$PSScriptRoot\lib.ps1"

$backupFile = $args[0]
$confirmed = $args[1]

if ([string]::IsNullOrWhiteSpace($backupFile)) {
  throw "Informe o caminho do backup."
}

if (-not (Test-Path $backupFile)) {
  throw "Backup não encontrado: $backupFile"
}

if ($confirmed -ne "--yes") {
  $answer = Read-Host "Digite RESTAURAR para substituir os dados locais atuais"
  if ($answer -ne "RESTAURAR") {
    throw "Restauração cancelada."
  }
}

Ensure-DockerReady
$projectDir = Get-MgProjectDir
if (-not (Test-Path (Join-Path $projectDir "docker-compose.yml"))) {
  throw "Projeto não encontrado em $projectDir."
}

Set-Location $projectDir
$tmp = Join-Path ([IO.Path]::GetTempPath()) ("mg-pocket-restore-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Expand-Archive -Path $backupFile -DestinationPath $tmp

if (Test-Path (Join-Path $tmp "env.docker-local")) {
  Copy-Item (Join-Path $tmp "env.docker-local") ".env.docker-local"
} else {
  Ensure-EnvFile $projectDir
}

try { Invoke-Compose @("--env-file", ".env.docker-local", "stop", "app", "adminer", "nginx") *> $null } catch {}
Invoke-Compose @("--env-file", ".env.docker-local", "up", "-d", "postgres")
Wait-Postgres

$dump = Join-Path $tmp "postgres.sql"
if (-not (Test-Path $dump)) {
  throw "Backup não contém postgres.sql."
}

Invoke-Compose @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "psql", "-U", "meg", "-d", "meg_pocket", "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
$compose = Resolve-ComposeCommand
$restoreArgs = @($compose.Prefix) + @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "psql", "-U", "meg", "-d", "meg_pocket")
Get-Content $dump | & $compose.File @restoreArgs
if ($LASTEXITCODE -ne 0) { throw "restore do banco falhou." }

$storage = Join-Path $tmp "storage\local\public"
if (Test-Path $storage) {
  Remove-Item -Recurse -Force "storage\local\public" -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path "storage\local" | Out-Null
  Copy-Item -Recurse $storage "storage\local\public"
}

Remove-Item -Recurse -Force $tmp
& "$PSScriptRoot\start.ps1"
Write-Host "Backup restaurado."
