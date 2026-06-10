param(
    [switch]$SkipBuild,
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

$services = @(
    @{ Name = "frontend";         Image = "gurpreetghs/netflix-frontend:$Tag";               Path = "$Root\frontend" },
    @{ Name = "auth";             Image = "gurpreetghs/netflix-auth-service:$Tag";           Path = "$Root\services\auth" },
    @{ Name = "user";             Image = "gurpreetghs/netflix-user-service:$Tag";           Path = "$Root\services\user" },
    @{ Name = "billing";          Image = "gurpreetghs/netflix-billing-service:$Tag";        Path = "$Root\services\billing" },
    @{ Name = "streaming";        Image = "gurpreetghs/netflix-streaming-service:$Tag";      Path = "$Root\services\streaming" },
    @{ Name = "catalog";          Image = "gurpreetghs/netflix-catalog:$Tag";                Path = "$Root\services\catalog" },
    @{ Name = "metadata";         Image = "gurpreetghs/netflix-metadata-service:$Tag";       Path = "$Root\services\metadata" },
    @{ Name = "recommendation";   Image = "gurpreetghs/netflix-recommendation-service:$Tag"; Path = "$Root\services\recommendation" },
    @{ Name = "search";           Image = "gurpreetghs/netflix-search-service:$Tag";         Path = "$Root\services\search" },
    @{ Name = "notification";     Image = "gurpreetghs/netflix-notification-service:$Tag";   Path = "$Root\services\notification" }
)

$failed = @()
$succeeded = @()

foreach ($svc in $services) {
    Write-Host ""
    Write-Host "=== $($svc.Name.ToUpper()) ===" -ForegroundColor Cyan

    if (-not (Test-Path "$($svc.Path)\Dockerfile")) {
        Write-Host "  WARNING: No Dockerfile at $($svc.Path) - skipping" -ForegroundColor Yellow
        $failed += $svc.Name
        continue
    }

    if (-not $SkipBuild) {
        Write-Host "  Building $($svc.Image)..." -ForegroundColor Gray
        docker build -t $svc.Image $svc.Path
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  FAILED: build for $($svc.Name)" -ForegroundColor Red
            $failed += $svc.Name
            continue
        }
    }

    Write-Host "  Pushing $($svc.Image)..." -ForegroundColor Gray
    docker push $svc.Image
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAILED: push for $($svc.Name)" -ForegroundColor Red
        $failed += $svc.Name
        continue
    }

    Write-Host "  OK: $($svc.Image)" -ForegroundColor Green
    $succeeded += $svc.Name
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor White
Write-Host "  Succeeded ($($succeeded.Count)): $($succeeded -join ', ')" -ForegroundColor Green

if ($failed.Count -gt 0) {
    Write-Host "  Failed ($($failed.Count)): $($failed -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All images pushed. Pods will recover automatically." -ForegroundColor Green
Write-Host "Watch with: kubectl get pods -n netflix -w" -ForegroundColor Gray
