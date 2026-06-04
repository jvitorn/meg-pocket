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
$ProgressPreference = "SilentlyContinue"

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
Set-Location $RepoRoot

$DefaultPostgresZipUrl = "https://get.enterprisedb.com/postgresql/postgresql-16.14-1-windows-x64-binaries.zip"

function Resolve-RepoPath {
  param([Parameter(Mandatory = $true)][string]$PathValue)

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $PathValue))
}

function Join-PortablePath {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$Relative
  )

  return Join-Path $Root ($Relative -replace '/', [System.IO.Path]::DirectorySeparatorChar)
}

function Remove-PathIfExists {
  param([Parameter(Mandatory = $true)][string]$PathValue)

  if (Test-Path -LiteralPath $PathValue) {
    Remove-Item -LiteralPath $PathValue -Recurse -Force
  }
}

function Assert-RequiredPath {
  param(
    [Parameter(Mandatory = $true)][string]$PathValue,
    [Parameter(Mandatory = $true)][string]$Description
  )

  if (-not (Test-Path -LiteralPath $PathValue)) {
    throw "Missing $Description: $PathValue"
  }
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string[]]$Arguments = @()
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command failed with exit code $LASTEXITCODE"
  }
}

function Copy-DirectoryContents {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  Assert-RequiredPath $Source "directory"
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
  }
}

function Copy-Directory {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  Assert-RequiredPath $Source "directory"
  Remove-PathIfExists $Destination
  New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

function Copy-File {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  Assert-RequiredPath $Source "file"
  New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Get-ZipFileNameFromUrl {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Fallback
  )

  try {
    $uri = [System.Uri]$Url
    $name = [System.IO.Path]::GetFileName($uri.LocalPath)
    if (-not [string]::IsNullOrWhiteSpace($name) -and $name.EndsWith(".zip")) {
      return $name
    }
  } catch {
    return $Fallback
  }

  return $Fallback
}

function Ensure-CachedZip {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$CacheFile
  )

  if (Test-Path -LiteralPath $CacheFile) {
    $existing = Get-Item -LiteralPath $CacheFile
    if ($existing.Length -gt 0) {
      Write-Host "Using cached $Name: $CacheFile"
      return $CacheFile
    }
    Remove-Item -LiteralPath $CacheFile -Force
  }

  if ($SkipDownload) {
    throw "Missing cached $Name at $CacheFile. Run once without -SkipDownload to populate .local-cache/portable-runtime/."
  }

  Write-Host "Downloading $Name: $Url"
  Invoke-WebRequest -Uri $Url -OutFile $CacheFile
  $downloaded = Get-Item -LiteralPath $CacheFile
  if ($downloaded.Length -le 0) {
    throw "Downloaded $Name ZIP is empty: $CacheFile"
  }

  return $CacheFile
}

function Expand-CachedZip {
  param(
    [Parameter(Mandatory = $true)][string]$ZipFile,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  Remove-PathIfExists $Destination
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  Expand-Archive -LiteralPath $ZipFile -DestinationPath $Destination -Force
}

function Ensure-NpmDependencies {
  $nodeModules = Join-Path $RepoRoot "node_modules"
  if (Test-Path -LiteralPath $nodeModules) {
    return
  }

  Write-Host "Installing npm dependencies"
  Invoke-External "npm" @("ci")
}

function Invoke-NextBuild {
  if ($SkipBuild) {
    Write-Host "Skipping Next build; using existing .next/standalone."
    return
  }

  Ensure-NpmDependencies
  Write-Host "Building Next standalone app"
  $previousReactCompiler = $env:NEXT_REACT_COMPILER
  try {
    $env:NEXT_REACT_COMPILER = "false"
    Invoke-External "npm" @("run", "build")
  } finally {
    if ($null -eq $previousReactCompiler) {
      Remove-Item Env:NEXT_REACT_COMPILER -ErrorAction SilentlyContinue
    } else {
      $env:NEXT_REACT_COMPILER = $previousReactCompiler
    }
  }
}

function Initialize-RuntimeTree {
  param([Parameter(Mandatory = $true)][string]$RuntimeRoot)

  Remove-PathIfExists $RuntimeRoot

  $directories = @(
    "runtime/node",
    "runtime/postgres",
    "runtime/nginx",
    "app",
    "prisma",
    "scripts",
    "templates"
  )

  foreach ($directory in $directories) {
    New-Item -ItemType Directory -Force -Path (Join-PortablePath $RuntimeRoot $directory) | Out-Null
  }
}

function Copy-AppPayload {
  param([Parameter(Mandatory = $true)][string]$RuntimeRoot)

  $standalone = Join-Path $RepoRoot ".next/standalone"
  $nextStatic = Join-Path $RepoRoot ".next/static"
  $public = Join-Path $RepoRoot "public"
  $appRoot = Join-PortablePath $RuntimeRoot "app"

  Copy-DirectoryContents $standalone $appRoot
  New-Item -ItemType Directory -Force -Path (Join-PortablePath $appRoot ".next") | Out-Null
  Copy-Directory $nextStatic (Join-PortablePath $appRoot ".next/static")
  Copy-Directory $public (Join-PortablePath $appRoot "public")
}

function Copy-PrismaPayload {
  param([Parameter(Mandatory = $true)][string]$RuntimeRoot)

  Copy-File (Join-Path $RepoRoot "prisma/schema.prisma") (Join-PortablePath $RuntimeRoot "prisma/schema.prisma")
  Copy-Directory (Join-Path $RepoRoot "prisma/migrations") (Join-PortablePath $RuntimeRoot "prisma/migrations")
  Copy-Directory (Join-Path $RepoRoot "prisma/seeds") (Join-PortablePath $RuntimeRoot "prisma/seeds")
}

function Copy-ScriptsPayload {
  param([Parameter(Mandatory = $true)][string]$RuntimeRoot)

  Copy-File (Join-Path $RepoRoot "scripts/run-sql-file.mjs") (Join-PortablePath $RuntimeRoot "scripts/run-sql-file.mjs")
  Copy-File (Join-Path $RepoRoot "scripts/portable-db-setup.mjs") (Join-PortablePath $RuntimeRoot "scripts/portable-db-setup.mjs")
  Copy-Directory (Join-Path $RepoRoot "scripts/lib") (Join-PortablePath $RuntimeRoot "scripts/lib")
  Copy-DirectoryContents (Join-Path $RepoRoot "launcher/portable/templates") (Join-PortablePath $RuntimeRoot "templates")
}

function Add-PortableNode {
  param(
    [Parameter(Mandatory = $true)][string]$RuntimeRoot,
    [Parameter(Mandatory = $true)][string]$WorkRoot,
    [Parameter(Mandatory = $true)][string]$CacheRoot
  )

  $zipName = "node-v$NodeVersion-win-x64.zip"
  $zip = Ensure-CachedZip "Node.js" "https://nodejs.org/dist/v$NodeVersion/$zipName" (Join-Path $CacheRoot $zipName)
  $dist = Join-Path $WorkRoot "node-dist"
  Expand-CachedZip $zip $dist
  $nodeRoot = Join-Path $dist "node-v$NodeVersion-win-x64"
  Copy-DirectoryContents $nodeRoot (Join-PortablePath $RuntimeRoot "runtime/node")
}

function Add-PortableNginx {
  param(
    [Parameter(Mandatory = $true)][string]$RuntimeRoot,
    [Parameter(Mandatory = $true)][string]$WorkRoot,
    [Parameter(Mandatory = $true)][string]$CacheRoot
  )

  $zipName = "nginx-$NginxVersion.zip"
  $zip = Ensure-CachedZip "Nginx" "https://nginx.org/download/$zipName" (Join-Path $CacheRoot $zipName)
  $dist = Join-Path $WorkRoot "nginx-dist"
  Expand-CachedZip $zip $dist
  $nginxRoot = Join-Path $dist "nginx-$NginxVersion"
  $runtimeNginx = Join-PortablePath $RuntimeRoot "runtime/nginx"
  Copy-DirectoryContents $nginxRoot $runtimeNginx
  $nginxDirs = @(
    (Join-Path $runtimeNginx "logs"),
    (Join-Path $runtimeNginx "temp")
  )
  New-Item -ItemType Directory -Force -Path $nginxDirs | Out-Null
}

function Add-PortablePostgres {
  param(
    [Parameter(Mandatory = $true)][string]$RuntimeRoot,
    [Parameter(Mandatory = $true)][string]$WorkRoot,
    [Parameter(Mandatory = $true)][string]$CacheRoot
  )

  if ([string]::IsNullOrWhiteSpace($PostgresZipUrl)) {
    $PostgresZipUrl = $DefaultPostgresZipUrl
  }

  $fallbackName = "postgresql-$PostgresVersion-windows-x64-binaries.zip"
  $zipName = Get-ZipFileNameFromUrl $PostgresZipUrl $fallbackName
  $zip = Ensure-CachedZip "PostgreSQL" $PostgresZipUrl (Join-Path $CacheRoot $zipName)
  $dist = Join-Path $WorkRoot "postgres-dist"
  Expand-CachedZip $zip $dist

  $postgresExe = Get-ChildItem -LiteralPath $dist -Recurse -File -Filter "postgres.exe" |
    Where-Object { $_.DirectoryName -match '[\\/]bin$' } |
    Select-Object -First 1

  if (-not $postgresExe) {
    throw "postgres.exe not found in a bin/ directory inside PostgreSQL ZIP."
  }

  $postgresRoot = Split-Path $postgresExe.DirectoryName -Parent
  Copy-DirectoryContents $postgresRoot (Join-PortablePath $RuntimeRoot "runtime/postgres")
}

function Test-RuntimePayload {
  param([Parameter(Mandatory = $true)][string]$RuntimeRoot)

  $required = @(
    "runtime/node/node.exe",
    "runtime/postgres/bin/postgres.exe",
    "runtime/postgres/bin/pg_ctl.exe",
    "runtime/postgres/bin/initdb.exe",
    "runtime/postgres/bin/psql.exe",
    "runtime/postgres/bin/pg_dump.exe",
    "runtime/postgres/bin/pg_restore.exe",
    "runtime/postgres/bin/createdb.exe",
    "runtime/nginx/nginx.exe",
    "app/server.js",
    "app/.next",
    "app/public",
    "prisma/schema.prisma",
    "prisma/migrations",
    "prisma/seeds/generated/index.sql",
    "scripts/run-sql-file.mjs",
    "scripts/portable-db-setup.mjs"
  )

  $missing = @($required | Where-Object {
    -not (Test-Path -LiteralPath (Join-PortablePath $RuntimeRoot $_))
  })

  if ($missing.Count -gt 0) {
    throw "Missing required portable runtime files:`n$($missing -join "`n")"
  }
}

function New-PortableManifest {
  param(
    [Parameter(Mandatory = $true)][string]$ZipFileName,
    [Parameter(Mandatory = $true)][string]$ZipPath,
    [Parameter(Mandatory = $true)][string]$ManifestPath,
    [Parameter(Mandatory = $true)][string]$PlainVersion,
    [Parameter(Mandatory = $true)][string]$RuntimeTag,
    [Parameter(Mandatory = $true)][string]$Repository
  )

  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
  $size = (Get-Item -LiteralPath $ZipPath).Length
  $manifest = [ordered]@{
    version = $PlainVersion
    runtimeVersion = $RuntimeTag
    windows = @{
      x64 = @{
        file = $ZipFileName
        url = "https://github.com/$Repository/releases/download/$RuntimeTag/$ZipFileName"
        sha256 = $hash
        sizeBytes = $size
      }
    }
    requirements = @{
      node = ">=22.12.0 <23"
      postgres = "16.x"
      nginx = "1.x"
    }
  } | ConvertTo-Json -Depth 8

  $manifest | Out-File -Encoding utf8 -FilePath $ManifestPath
}

$RuntimeTagPrefix = $RuntimeTagPrefix.Trim().TrimEnd("-")
if ([string]::IsNullOrWhiteSpace($RuntimeTagPrefix)) {
  throw "RuntimeTagPrefix cannot be empty."
}

$Version = $Version.Trim()
if ($Version.StartsWith("$RuntimeTagPrefix-")) {
  $Version = $Version.Substring($RuntimeTagPrefix.Length + 1)
}
if (-not $Version.StartsWith("v")) {
  $Version = "v$Version"
}

$PlainVersion = $Version -replace '^v', ''
$RuntimeTag = "$RuntimeTagPrefix-$Version"

if ([string]::IsNullOrWhiteSpace($Repository)) {
  $Repository = $env:GITHUB_REPOSITORY
}
if ([string]::IsNullOrWhiteSpace($Repository)) {
  $Repository = "jvitorn/meg-pocket"
}

$OutputRoot = Resolve-RepoPath $OutputDir
$RuntimeRoot = Resolve-RepoPath "portable-runtime"
$CacheRoot = Resolve-RepoPath ".local-cache/portable-runtime"
$WorkRoot = Join-Path $OutputRoot "work"
$ZipFileName = "meg-pocket-portable-runtime-windows-x64-$Version.zip"
$ZipPath = Join-Path $OutputRoot $ZipFileName
$ManifestPath = Join-Path $OutputRoot "portable-manifest.json"

Write-Host "Building portable runtime $RuntimeTag"
Write-Host "Output directory: $OutputRoot"

$buildDirs = @($OutputRoot, $CacheRoot)
New-Item -ItemType Directory -Force -Path $buildDirs | Out-Null
Remove-PathIfExists $WorkRoot
Remove-PathIfExists $ZipPath
Remove-PathIfExists $ManifestPath
New-Item -ItemType Directory -Force -Path $WorkRoot | Out-Null

try {
  Invoke-NextBuild
  Initialize-RuntimeTree $RuntimeRoot
  Copy-AppPayload $RuntimeRoot
  Copy-PrismaPayload $RuntimeRoot
  Copy-ScriptsPayload $RuntimeRoot
  Add-PortableNode $RuntimeRoot $WorkRoot $CacheRoot
  Add-PortableNginx $RuntimeRoot $WorkRoot $CacheRoot
  Add-PortablePostgres $RuntimeRoot $WorkRoot $CacheRoot
  Test-RuntimePayload $RuntimeRoot

  Compress-Archive -Path (Join-Path $RuntimeRoot "*") -DestinationPath $ZipPath -Force
  New-PortableManifest $ZipFileName $ZipPath $ManifestPath $PlainVersion $RuntimeTag $Repository
} finally {
  Remove-PathIfExists $WorkRoot
}

if ($SkipPublish) {
  Write-Host "SkipPublish specified. No publishing is performed by this local build script."
}

Write-Host "Portable runtime ZIP: $ZipPath"
Write-Host "Portable manifest: $ManifestPath"
