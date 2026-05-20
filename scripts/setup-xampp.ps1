# XAMPP config (no Docker)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Copy-Item (Join-Path $root "api\config.local.xampp.php") (Join-Path $root "api\config.local.php") -Force
Write-Host "api/config.local.php -> XAMPP (root, empty password)"
Write-Host ""
Write-Host "Copy project to: C:\xampp\htdocs\go_hockey"
Write-Host "Create DB hockey_time in http://localhost/phpmyadmin"
Write-Host "Open: http://localhost/go_hockey/api/install.php?secret=local-dev-secret"
Write-Host "In .env: VITE_API_PROXY=http://localhost/go_hockey"
