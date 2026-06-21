[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [string]$OutputDir = "portable-runtime-dist",
  [string]$PostgresZipUrl = "",
  [switch]$SkipBuild,
  [switch]$SkipDownload,
  [switch]$SkipPublish,
  [string]$RuntimeTagPrefix = "portable-runtime",
  [string]$NodeVersion = "22.13.0",
  [string]$NginxVersion = "1.27.4",
  [string]$PostgresVersion = "16.14",
  [string]$Repository = ""
)

$ErrorActionPreference = "Stop"

$CoreScript = Join-Path (Join-Path $PSScriptRoot "portable-runtime") "build-core-windows.ps1"
if (-not (Test-Path -LiteralPath $CoreScript)) {
  throw "Missing shared portable runtime core script: $CoreScript"
}

if ($SkipPublish) {
  Write-Host "SkipPublish specified. The local wrapper never publishes; GitHub Actions owns release publishing."
}

$coreArgs = @{
  Version = $Version
  OutputDir = $OutputDir
  RuntimeTagPrefix = $RuntimeTagPrefix
  NodeVersion = $NodeVersion
  NginxVersion = $NginxVersion
  PostgresVersion = $PostgresVersion
}

if (-not [string]::IsNullOrWhiteSpace($PostgresZipUrl)) {
  $coreArgs.PostgresZipUrl = $PostgresZipUrl
}

if ($SkipBuild) {
  $coreArgs.SkipBuild = $true
}

if ($SkipDownload) {
  $coreArgs.SkipDownload = $true
}

if (-not [string]::IsNullOrWhiteSpace($Repository)) {
  $coreArgs.Repository = $Repository
}

Write-Host "Running shared portable runtime core: $CoreScript"
& $CoreScript @coreArgs
