. "$PSScriptRoot\lib.ps1"

Ensure-DockerReady
$projectDir = Get-MgProjectDir
if (-not (Test-Path (Join-Path $projectDir "docker-compose.yml"))) {
  throw "Projeto não encontrado em $projectDir. Instale/atualize o M&G Pocket primeiro."
}

Set-Location $projectDir
New-Item -ItemType Directory -Force -Path "storage\local\public" | Out-Null
Ensure-EnvFile $projectDir
Stop-LegacyAppComposeProject
Invoke-Compose @("--env-file", ".env.docker-local", "up", "-d", "postgres", "storage", "app")
Start-OptionalAdminer
Wait-AppDatabase
Wait-App
Write-Host "M&G Pocket iniciado em http://localhost:3000"
