. "$PSScriptRoot\lib.ps1"

$repoUrl = if ([string]::IsNullOrWhiteSpace($env:MG_POCKET_REPO_URL)) { "https://github.com/jvitorn/meg-pocket.git" } else { $env:MG_POCKET_REPO_URL }
$zipUrl = if ([string]::IsNullOrWhiteSpace($env:MG_POCKET_ZIP_URL)) { "https://github.com/jvitorn/meg-pocket/archive/refs/heads/master.zip" } else { $env:MG_POCKET_ZIP_URL }
$projectDir = Get-MgProjectDir
$parent = Split-Path $projectDir -Parent

Ensure-DockerReady
New-Item -ItemType Directory -Force -Path $parent | Out-Null

if (Test-Path (Join-Path $projectDir ".git")) {
  Write-Host "Projeto já existe. Atualizando com git pull --ff-only..."
  & git -C $projectDir pull --ff-only
  if ($LASTEXITCODE -ne 0) { throw "git pull falhou." }
} elseif (Test-Path (Join-Path $projectDir "docker-compose.yml")) {
  Write-Host "Projeto já existe em $projectDir. Mantendo arquivos locais."
} else {
  if (Test-Path $projectDir) {
    throw "O caminho $projectDir já existe, mas não parece ser o projeto M&G Pocket."
  }

  if (Test-Command "git") {
    Write-Host "Baixando projeto com git clone..."
    & git clone $repoUrl $projectDir
    if ($LASTEXITCODE -ne 0) { throw "git clone falhou." }
  } else {
    Write-Host "Git não encontrado. Baixando ZIP do projeto..."
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("mg-pocket-" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    $zip = Join-Path $tmp "meg-pocket.zip"
    Invoke-WebRequest -Uri $zipUrl -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $tmp
    $extracted = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1
    if (-not $extracted) { throw "ZIP do projeto não gerou pasta válida." }
    Move-Item -Path $extracted.FullName -Destination $projectDir
    Remove-Item -Recurse -Force $tmp
  }
}

Set-Location $projectDir
New-Item -ItemType Directory -Force -Path "storage\local\public" | Out-Null
New-Item -ItemType Directory -Force -Path "public\uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "installers" | Out-Null
Ensure-EnvFile $projectDir
Stop-LegacyAppComposeProject

Write-Host "Baixando versão pronta do M&G Pocket..."
Invoke-Compose @("--env-file", ".env.docker-local", "pull", "app", "maintenance")
Invoke-Compose @("--env-file", ".env.docker-local", "up", "-d", "postgres")
Wait-Postgres
Invoke-Compose @("--env-file", ".env.docker-local", "run", "--rm", "maintenance", "npm", "run", "db:setup")

$seedMarker = "installers\.seed-inicial-concluido"
$seedQuery = "SELECT CASE WHEN to_regclass('""Classe""') IS NULL OR to_regclass('""Raca""') IS NULL OR to_regclass('""MagiaCatalog""') IS NULL OR to_regclass('""PericiaCatalog""') IS NULL OR to_regclass('""Item""') IS NULL THEN 0 WHEN (SELECT count(*) FROM ""Classe"") > 0 AND (SELECT count(*) FROM ""Raca"") > 0 AND (SELECT count(*) FROM ""MagiaCatalog"") > 0 AND (SELECT count(*) FROM ""PericiaCatalog"") > 0 AND (SELECT count(*) FROM ""Item"") > 0 THEN 1 ELSE 0 END;"
$seedReady = ""
try {
  $seedReady = (Invoke-Compose @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "psql", "-U", "meg", "-d", "meg_pocket", "-tAc", $seedQuery)) -join ""
  $seedReady = $seedReady.Trim()
} catch {}

if ((Test-Path $seedMarker) -or $seedReady -eq "1") {
  Write-Host "Seed inicial já executado ou dados essenciais já existem. Pulando seed."
  New-Item -ItemType File -Force -Path $seedMarker | Out-Null
} else {
  Invoke-Compose @("--env-file", ".env.docker-local", "run", "--rm", "maintenance", "npm", "run", "db:seed")
  New-Item -ItemType File -Force -Path $seedMarker | Out-Null
}

Invoke-Compose @("--env-file", ".env.docker-local", "up", "-d", "app", "nginx")
Start-OptionalAdminer
Wait-AppAlive
Write-DatabaseWarningIfUnavailable
Wait-App
Write-Host "M&G Pocket instalado e online em http://localhost:3000"
Write-Host "Validação automatizada completa fica reservada ao ambiente de desenvolvimento/CI para poupar esta máquina."
