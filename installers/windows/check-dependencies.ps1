. "$PSScriptRoot\lib.ps1"

$missing = @()
$instructions = @()
$packages = @()
$commands = @()

$wingetInstalled = Test-Command "winget"
$gitInstalled = Test-Command "git"
$powerShellInstalled = Test-Command "powershell"
$dockerDesktopInstalled = Test-DockerDesktopInstalled
$dockerCliInstalled = Test-Command "docker"
$dockerRunning = $false
$dockerComposeInstalled = $false
$wsl2Installed = Test-Wsl2Available

if (-not $powerShellInstalled) {
  $missing += "PowerShell"
  $instructions += "Abra o Windows Update ou instale PowerShell antes de continuar."
}

if (-not $wingetInstalled) {
  $missing += "winget"
  $instructions += "Instale ou atualize o App Installer pela Microsoft Store para habilitar winget."
}

if (-not $gitInstalled) {
  $missing += "Git for Windows"
  $packages += "Git.Git"
  $commands += "winget install -e --id Git.Git"
  $instructions += "Instale o Git for Windows e tente novamente."
}

if (-not $dockerDesktopInstalled) {
  $missing += "Docker Desktop"
  $packages += "Docker.DockerDesktop"
  $commands += "winget install -e --id Docker.DockerDesktop"
  $instructions += "Instale o Docker Desktop, abra o aplicativo e tente novamente."
}

if ($dockerDesktopInstalled -and -not $dockerCliInstalled) {
  $missing += "Docker CLI"
  $instructions += "Abra o Docker Desktop ou reinstale o Docker Desktop para disponibilizar o comando docker."
}

if ($dockerCliInstalled) {
  & docker info *> $null
  $dockerRunning = $LASTEXITCODE -eq 0
  if (-not $dockerRunning) {
    $missing += "Docker Desktop em execução"
    $instructions += "Abra o Docker Desktop e aguarde o Docker Engine iniciar."
  }

  try {
    Resolve-ComposeCommand *> $null
    $dockerComposeInstalled = $true
  } catch {
    $missing += "Docker Compose"
    $instructions += "Atualize ou reinstale o Docker Desktop para incluir o Docker Compose."
  }
}

if ($dockerDesktopInstalled -and -not $wsl2Installed) {
  $missing += "WSL2"
  $instructions += "O Docker Desktop pode solicitar WSL2. Se isso acontecer, reinicie o Windows e abra o Docker Desktop novamente."
}

$installable = $wingetInstalled -and (($packages | Select-Object -Unique).Count -gt 0)
$installCommand = ($commands | Select-Object -Unique) -join "`n"

$status = [ordered]@{
  os = "windows"
  distroFamily = $null
  distroName = "Windows"
  supported = $true
  missing = $missing
  packages = ($packages | Select-Object -Unique)
  installable = $installable
  sudoRequired = $installable
  installCommand = $installCommand
  commands = ($commands | Select-Object -Unique)
  manualInstructions = ($instructions -join " ")
}

$status | ConvertTo-Json -Depth 4
