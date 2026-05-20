# Local dev setup (Windows PowerShell)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$configLocal = Join-Path $root "api\config.local.php"
$configDocker = Join-Path $root "api\config.local.docker.php"

if (-not (Test-Path $configLocal)) {
    Copy-Item $configDocker $configLocal
    Write-Host "Created api/config.local.php from Docker template."
} else {
    Write-Host "api/config.local.php exists, skipped."
}

$seed = Join-Path $root "database\seed.json"
if (-not (Test-Path $seed)) {
    Copy-Item (Join-Path $root "database\seed.example.json") $seed
    Write-Host "Created database/seed.json - edit phones and passwords."
}

Write-Host ""
Write-Host "Next:"
Write-Host "  1. Install Docker Desktop"
Write-Host "  2. docker compose up -d"
Write-Host "  3. npm.cmd run local:install"
Write-Host "  4. npm.cmd run dev"
