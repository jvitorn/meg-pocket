$ErrorActionPreference = "Stop"

$repo = $env:MG_POCKET_REPO
if ([string]::IsNullOrWhiteSpace($repo)) {
  $repo = "jvitorn/meg-pocket"
}

$releasesUrl = "https://github.com/$repo/releases"

Write-Host "M&G Pocket Launcher"
Write-Host ""
Write-Host "No Windows, baixe o instalador .exe pela página de Releases."
Write-Host "O Docker Desktop deve ser instalado e aberto antes de preparar o projeto."
Write-Host ""
Write-Host $releasesUrl

Start-Process $releasesUrl
