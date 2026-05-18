. "$PSScriptRoot\lib.ps1"

$projectDir = Get-MgProjectDir
$wingetInstalled = Test-Command "winget"
$gitInstalled = Test-Command "git"
$powerShellInstalled = Test-Command "powershell"
$dockerDesktopInstalled = Test-DockerDesktopInstalled
$wsl2Installed = Test-Wsl2Available
$dockerInstalled = Test-Command "docker"
$dockerRunning = $false
$dockerComposeInstalled = $false
$dockerVersion = ""
$composeVersion = ""

if ($dockerInstalled) {
  try {
    $dockerVersion = (& docker --version 2>$null) -join " "
  } catch {}

  & docker info *> $null
  $dockerRunning = $LASTEXITCODE -eq 0

  try {
    $compose = Resolve-ComposeCommand
    $allArgs = @($compose.Prefix) + @("version")
    $composeVersion = (& $compose.File @allArgs 2>$null) -join " "
    $dockerComposeInstalled = $true
  } catch {
    $dockerComposeInstalled = $false
  }
}

$status = [ordered]@{
  os = "windows"
  distroFamily = $null
  distroName = "Windows"
  supported = $true
  wingetInstalled = $wingetInstalled
  gitInstalled = $gitInstalled
  powerShellInstalled = $powerShellInstalled
  wsl2Installed = $wsl2Installed
  dockerDesktopInstalled = $dockerDesktopInstalled
  dockerInstalled = $dockerInstalled
  dockerVersion = $dockerVersion
  dockerRunning = $dockerRunning
  dockerComposeInstalled = $dockerComposeInstalled
  dockerComposeVersion = $composeVersion
  dockerPermissionOk = $true
  sudoDockerWorks = $false
  requiresRelogin = $false
  projectInstalled = (Test-Path (Join-Path $projectDir "docker-compose.yml"))
  projectPath = $projectDir
  projectVersion = ""
  appOnline = (Test-Url "http://localhost:3000")
  adminerOnline = (Test-Url "http://localhost:8081")
}

$status | ConvertTo-Json -Depth 4
