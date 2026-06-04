# PowerShell local run helper script for Windows
# Run this script to boot up the entire local multi-container development sandbox.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  NETFLIX CLONE MICROSERVICES - LOCAL SANDBOX STARTUP" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if Docker is running
if (!(Get-Process docker -ErrorAction SilentlyContinue)) {
    Write-Host "WARNING: Docker Desktop does not seem to be running. Please start Docker Desktop first!" -ForegroundColor Yellow
}

Write-Host "`n1. Building and starting local container stack via Docker Compose..." -ForegroundColor Green
docker-compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Compose startup failed. Check the error output above." -ForegroundColor Red
    Exit 1
}

Write-Host "`n2. Waiting for services to initialize..." -ForegroundColor Green
Start-Sleep -Seconds 10

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  LOCAL SERVICES HEALTH DASHBOARD" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Frontend Web Client   : http://localhost:3000" -ForegroundColor Green
Write-Host "  Auth Service (Port)   : http://localhost:5001" -ForegroundColor Green
Write-Host "  Catalog Service (Port): http://localhost:5002" -ForegroundColor Green
Write-Host "  Streaming Service (Pt): http://localhost:5003" -ForegroundColor Green
Write-Host "  User Service (Port)   : http://localhost:5004" -ForegroundColor Green
Write-Host "  Metadata Service (Pt) : http://localhost:5005" -ForegroundColor Green
Write-Host "  Recommendation Svc    : http://localhost:5006" -ForegroundColor Green
Write-Host "  Search Service (Port) : http://localhost:5007" -ForegroundColor Green
Write-Host "  Billing Service (Pt)  : http://localhost:5008" -ForegroundColor Green
Write-Host "  Notification Svc (Pt) : http://localhost:5009" -ForegroundColor Green
Write-Host "  Postgres Database     : localhost:5432" -ForegroundColor Green
Write-Host "  Redis Cache Cluster   : localhost:6379" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "`nTo check container logs, run: docker-compose logs -f" -ForegroundColor Yellow
Write-Host "To shut down the sandbox, run: docker-compose down -v" -ForegroundColor Yellow
