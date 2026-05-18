. "$PSScriptRoot\lib.ps1"

$mode = if ($args.Count -gt 0) { $args[0] } else { "safe" }
if ($mode -ne "safe" -and $mode -ne "complete") {
  throw "Modo de remoção inválido."
}

$projectDir = Get-MgProjectDir
if (-not (Test-Path $projectDir)) {
  Write-Host "Projeto local não encontrado em $projectDir."
  exit 0
}

$resolvedProject = (Resolve-Path $projectDir).Path
$defaultProject = Join-Path $env:LOCALAPPDATA "mg-pocket\app"
if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
  $defaultProject = Join-Path $HOME ".local\share\mg-pocket\app"
}
$defaultParent = Split-Path $defaultProject -Parent
New-Item -ItemType Directory -Force -Path $defaultParent | Out-Null
$resolvedDefault = Join-Path ((Resolve-Path $defaultParent).Path) "app"

if ($resolvedProject -eq [IO.Path]::GetPathRoot($resolvedProject) -or $resolvedProject -eq $HOME) {
  throw "Caminho de remoção inválido."
}

if (-not (Test-Path (Join-Path $resolvedProject "docker-compose.yml"))) {
  throw "Não encontrei docker-compose.yml no projeto local. Remoção cancelada."
}

if (-not (Test-Path (Join-Path $resolvedProject "package.json"))) {
  throw "Não encontrei package.json no projeto local. Remoção cancelada."
}

if ($resolvedProject -ne $resolvedDefault -and $env:MG_POCKET_ALLOW_CUSTOM_PROJECT_DELETE -ne "1") {
  throw "O caminho do projeto não é o diretório local esperado do launcher. Remoção cancelada por segurança: $resolvedProject"
}

Set-Location $resolvedProject

if ($mode -eq "complete") {
  Write-Host "Remoção completa: parando containers e removendo volumes/redes do projeto."
  try {
    if (Test-Path ".env.docker-local") {
      Invoke-Compose @("--env-file", ".env.docker-local", "down", "-v", "--remove-orphans")
    } else {
      Invoke-Compose @("down", "-v", "--remove-orphans")
    }
  } catch {
    Write-Host "Não foi possível parar todos os containers pelo Docker. Continuando com a remoção da pasta local."
  }
} else {
  Write-Host "Remoção segura: parando containers e preservando volumes Docker."
  try {
    if (Test-Path ".env.docker-local") {
      Invoke-Compose @("--env-file", ".env.docker-local", "down", "--remove-orphans")
    } else {
      Invoke-Compose @("down", "--remove-orphans")
    }
  } catch {
    Write-Host "Não foi possível parar todos os containers pelo Docker. Continuando com a remoção da pasta local."
  }
}

Set-Location ([IO.Path]::GetPathRoot($resolvedProject))
Remove-Item -Recurse -Force $resolvedProject
Write-Host "Projeto local removido de $resolvedProject."
