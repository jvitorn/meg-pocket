$ErrorActionPreference = "Stop"

function Get-MgProjectDir {
  if (-not [string]::IsNullOrWhiteSpace($env:MG_POCKET_PROJECT_DIR)) {
    return $env:MG_POCKET_PROJECT_DIR
  }

  $root = $env:LOCALAPPDATA
  if ([string]::IsNullOrWhiteSpace($root)) {
    $root = Join-Path $HOME ".local\share"
  }

  return (Join-Path $root "mg-pocket\app")
}

function Get-MgBackupDir {
  $documents = [Environment]::GetFolderPath("MyDocuments")
  if ([string]::IsNullOrWhiteSpace($documents)) {
    return (Join-Path $HOME ".local\share\mg-pocket\backups")
  }

  return (Join-Path $documents "MG Pocket\backups")
}

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-Url($Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 4
    return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Resolve-ComposeCommand {
  if (Test-Command "docker") {
    & docker compose version *> $null
    if ($LASTEXITCODE -eq 0) {
      return @{ File = "docker"; Prefix = @("compose") }
    }
  }

  if (Test-Command "docker-compose") {
    & docker-compose version *> $null
    if ($LASTEXITCODE -eq 0) {
      return @{ File = "docker-compose"; Prefix = @() }
    }
  }

  throw "Docker Compose não foi encontrado. Atualize o Docker Desktop."
}

function Get-ComposeProjectName {
  if (-not [string]::IsNullOrWhiteSpace($env:MG_POCKET_COMPOSE_PROJECT_NAME)) {
    return $env:MG_POCKET_COMPOSE_PROJECT_NAME
  }

  return "meg-pocket"
}

function Invoke-Compose {
  param([string[]]$ComposeArgs)

  $compose = Resolve-ComposeCommand
  $allArgs = @($compose.Prefix) + @("--project-name", (Get-ComposeProjectName)) + @($ComposeArgs)
  & $compose.File @allArgs
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose falhou com código $LASTEXITCODE."
  }
}

function Invoke-ComposeProject {
  param([string]$ProjectName, [string[]]$ComposeArgs)

  $compose = Resolve-ComposeCommand
  $allArgs = @($compose.Prefix) + @("--project-name", $ProjectName) + @($ComposeArgs)
  & $compose.File @allArgs
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose falhou com código $LASTEXITCODE."
  }
}

function Ensure-DockerReady {
  if (-not (Test-Command "docker")) {
    throw "No Windows, instale o Docker Desktop antes de continuar."
  }

  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop não está rodando. Abra o Docker Desktop e tente novamente."
  }

  Resolve-ComposeCommand *> $null
}

function Ensure-EnvFile($ProjectDir) {
  $envFile = Join-Path $ProjectDir ".env.docker-local"
  if (Test-Path $envFile) {
    Write-Host ".env.docker-local já existe. Mantendo arquivo atual."
    return
  }

  $example = Join-Path $ProjectDir ".env.example"
  if (Test-Path $example) {
    Copy-Item $example $envFile
  } else {
    @"
DATABASE_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
DIRECT_URL="postgresql://meg:meg@localhost:5433/meg_pocket?schema=public"
NEXTAUTH_SECRET="meg-pocket-local-secret-change-me"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
STORAGE_DRIVER="local"
STORAGE_BUCKET="personagens"
STORAGE_LOCAL_DIR="./storage/local/public"
STORAGE_LOCAL_PUBLIC_URL="http://localhost:9323"
NEXT_PUBLIC_STORAGE_MAX_FILE_SIZE_MB="40"
ADMINER_URL="http://localhost:8081"
"@ | Set-Content -Path $envFile -Encoding UTF8
  }

  $secret = [Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")
  $content = Get-Content $envFile -Raw
  $content = $content -replace 'NEXTAUTH_SECRET=.*', "NEXTAUTH_SECRET=`"$secret`""
  Set-Content -Path $envFile -Value $content -Encoding UTF8
}

function Wait-Postgres {
  param([int]$Attempts = 60)

  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      Invoke-Compose @("--env-file", ".env.docker-local", "exec", "-T", "postgres", "pg_isready", "-U", "meg", "-d", "meg_pocket") *> $null
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "Postgres não ficou pronto a tempo."
}

function Wait-AppDatabase {
  param([int]$Attempts = 60)

  for ($i = 0; $i -lt $Attempts; $i++) {
    try {
      Invoke-Compose @("exec", "-T", "app", "pg_isready", "-h", "postgres", "-p", "5432", "-U", "meg", "-d", "meg_pocket") *> $null
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "O app iniciou, mas ainda não consegue acessar o Postgres pelo Docker."
}

function Start-OptionalAdminer {
  try {
    Invoke-Compose @("up", "-d", "adminer")
  } catch {
    Write-Host "Adminer não foi iniciado automaticamente, provavelmente porque a porta 8081 já está em uso."
    Write-Host "O M&G Pocket pode continuar funcionando sem o Adminer."
  }
}

function Stop-LegacyAppComposeProject {
  if ((Get-ComposeProjectName) -eq "app") {
    return
  }

  try {
    Invoke-ComposeProject "app" @("down", "--remove-orphans") *> $null
  } catch {}
}

function Stop-ComposeProjectStack {
  param(
    [string]$ProjectName,
    [switch]$Required
  )

  $composeArgs = @()
  if (Test-Path ".env.docker-local") {
    $composeArgs += @("--env-file", ".env.docker-local")
  }
  $composeArgs += @("down", "--remove-orphans")

  if ($Required) {
    Invoke-ComposeProject $ProjectName $composeArgs
    return
  }

  try {
    Invoke-ComposeProject $ProjectName $composeArgs *> $null
  } catch {}
}

function Stop-AllProjectStacks {
  $currentProject = Get-ComposeProjectName
  Stop-ComposeProjectStack $currentProject -Required

  if ($currentProject -ne "meg-pocket") {
    Stop-ComposeProjectStack "meg-pocket"
  }

  if ($currentProject -ne "app") {
    Stop-ComposeProjectStack "app"
  }
}

function Invoke-ProjectTestSuite {
  Write-Host "Executando testes automatizados do M&G Pocket..."
  Write-Host "Esta etapa pode levar alguns minutos na primeira instalação."
  Invoke-Compose @("exec", "-T", "app", "sh", "-lc", "NODE_ENV=test MEG_E2E_DOCKER=1 MEG_E2E_REUSE_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run test:all")
  Write-Host "Testes automatizados concluídos com sucesso."
}

function Wait-App {
  param([string]$Url = "http://localhost:3000", [int]$Attempts = 60)

  for ($i = 0; $i -lt $Attempts; $i++) {
    if (Test-Url $Url) {
      return
    }
    Start-Sleep -Seconds 2
  }

  throw "$Url não respondeu a tempo."
}
