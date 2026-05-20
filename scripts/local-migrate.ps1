$url = "http://go_hockey.test/api/migrate-rosters.php?secret=local-dev-secret"
Write-Host "Migrate: $url"
try {
  $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60
  Write-Host $r.Content
} catch {
  Write-Host $_.Exception.Message
  Write-Host "Or open in browser: $url"
}
