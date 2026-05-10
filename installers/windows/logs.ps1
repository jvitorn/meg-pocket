. "$PSScriptRoot\lib.ps1"

$projectDir = Get-MgProjectDir
if (-not (Test-Path (Join-Path $projectDir "docker-compose.yml"))) {
  throw "Projeto não encontrado em $projectDir."
}

Set-Location $projectDir
if ($args.Count -gt 0 -and ($args[0] -eq "--follow" -or $args[0] -eq "-f")) {
  Invoke-Compose @("--env-file", ".env.docker-local", "logs", "-f", "--tail=200")
} else {
  Invoke-Compose @("--env-file", ".env.docker-local", "logs", "--tail=200")
}
