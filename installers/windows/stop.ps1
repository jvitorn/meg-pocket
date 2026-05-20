. "$PSScriptRoot\lib.ps1"

Ensure-DockerReady
$projectDir = Get-MgProjectDir
if (-not (Test-Path (Join-Path $projectDir "docker-compose.yml"))) {
  throw "Projeto não encontrado em $projectDir."
}

Set-Location $projectDir
Stop-AllProjectStacks
Write-Host "M&G Pocket parado. Dados locais preservados."
