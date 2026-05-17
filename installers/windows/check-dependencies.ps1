. "$PSScriptRoot\lib.ps1"

$missing = @()
$instructions = @()

if (-not (Test-Command "git")) {
  $missing += "Git for Windows"
  $instructions += "Instale o Git for Windows e tente novamente."
}

if (-not (Test-Command "docker")) {
  $missing += "Docker Desktop"
  $instructions += "Instale o Docker Desktop, abra o aplicativo e tente novamente."
} else {
  & docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    $missing += "Docker Desktop em execução"
    $instructions += "O Docker Desktop não está rodando. Abra o Docker Desktop e tente novamente."
  }

  try {
    Resolve-ComposeCommand *> $null
  } catch {
    $missing += "Docker Compose"
    $instructions += "Atualize ou reinstale o Docker Desktop para incluir o Docker Compose."
  }
}

$status = [ordered]@{
  os = "windows"
  distroFamily = $null
  distroName = "Windows"
  supported = $true
  missing = $missing
  packages = @()
  installable = $false
  sudoRequired = $false
  installCommand = ""
  manualInstructions = ($instructions -join " ")
}

$status | ConvertTo-Json -Depth 4
