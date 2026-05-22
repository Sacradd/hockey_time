$url = "http://go_hockey.test/api/migrate-dev-super.php?secret=local-dev-secret"
Write-Host "Dev super: $url"
try {
  $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60
  Write-Host $r.Content
} catch {
  Write-Host $_.Exception.Message
  Write-Host "Docker: http://localhost:8080/api/migrate-dev-super.php?secret=local-dev-secret"
  Write-Host "Laragon: $url"
}
