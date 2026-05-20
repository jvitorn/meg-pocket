. "$PSScriptRoot\lib.ps1"

if (-not (Test-DockerDesktopInstalled)) {
  throw "Docker Desktop não foi encontrado. Instale pelo fluxo de dependências do launcher ou pela página oficial."
}

if (-not (Test-Command "docker")) {
  $desktopPath = Get-DockerDesktopPath
  if (-not [string]::IsNullOrWhiteSpace($desktopPath)) {
    Write-Host "Abrindo Docker Desktop..."
    Start-Process -FilePath $desktopPath | Out-Null
  }

  throw "Docker CLI ainda não está disponível. Abra o Docker Desktop; se necessário, reinicie o Windows e tente novamente."
}

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
  $desktopPath = Get-DockerDesktopPath
  if (-not [string]::IsNullOrWhiteSpace($desktopPath)) {
    Write-Host "Abrindo Docker Desktop..."
    Start-Process -FilePath $desktopPath | Out-Null
  } else {
    Write-Host "Abra o Docker Desktop pelo menu iniciar."
  }

  Write-Host "Aguardando o Docker Engine iniciar..."
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 2
    & docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      break
    }
  }
}

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop não iniciou a tempo. Abra o Docker Desktop manualmente; se ele pedir WSL2 ou reinicialização, reinicie o Windows e volte ao launcher."
}

& docker --version
if ($LASTEXITCODE -ne 0) {
  throw "Docker CLI não respondeu corretamente."
}

Resolve-ComposeCommand *> $null
Write-Host "Docker Desktop e Docker Compose estão prontos."
