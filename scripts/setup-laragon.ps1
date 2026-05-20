# Laragon config (no Docker)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Copy-Item (Join-Path $root "api\config.local.laragon.php") (Join-Path $root "api\config.local.php") -Force
Write-Host "api/config.local.php -> Laragon (root, empty password, DB hockey_time)"
Write-Host ""
Write-Host "In Laragon: create empty database 'hockey_time'"
Write-Host "Open: http://go_hockey.test/api/install.php?secret=local-dev-secret"
Write-Host "Vite: set proxy target in vite.config.ts to http://go_hockey.test if needed"
