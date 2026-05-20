# Run install.php against local Docker API
$ErrorActionPreference = "Stop"

$url = "http://localhost:8080/api/install.php?secret=local-dev-secret"
Write-Host "Request: $url"

$max = 15
for ($i = 1; $i -le $max; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
        Write-Host $r.Content
        if ($r.Content -match '"ok"\s*:\s*true') {
            exit 0
        }
        exit 1
    } catch {
        if ($i -eq $max) {
            Write-Host "Error: $_"
            Write-Host "Check: docker compose ps, api/config.local.php, database/seed.json"
            exit 1
        }
        Write-Host "Waiting for API ($i/$max)..."
        Start-Sleep -Seconds 3
    }
}
