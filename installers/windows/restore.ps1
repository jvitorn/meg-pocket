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
Ensure-EnvFile $projectDir

try { Invoke-Compose @("--env-file", ".env.docker-local", "stop", "app", "adminer", "nginx") *> $null } catch {}
Invoke-Compose @("--env-file", ".env.docker-local", "up", "-d", "postgres")
Wait-Postgres

$compose = Resolve-ComposeCommand
$extension = [IO.Path]::GetExtension($backupFile).ToLowerInvariant()
if ($extension -eq ".sql") {
  Invoke-Compose @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "psql", "-U", "meg", "-d", "meg_pocket", "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
  $restoreArgs = @($compose.Prefix) + @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "psql", "-U", "meg", "-d", "meg_pocket")
  Get-Content $backupFile | & $compose.File @restoreArgs
} elseif ($extension -eq ".dump") {
  $restoreArgs = @($compose.Prefix) + @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "pg_restore", "--clean", "--if-exists", "--no-owner", "-U", "meg", "-d", "meg_pocket")
  Get-Content $backupFile -Encoding Byte -ReadCount 0 | & $compose.File @restoreArgs
} else {
  throw "Formato de backup inválido. Use .sql ou .dump."
}
if ($LASTEXITCODE -ne 0) { throw "restore do banco falhou." }
& "$PSScriptRoot\start.ps1"
Write-Host "Backup restaurado."
