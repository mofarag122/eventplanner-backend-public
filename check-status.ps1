# Quick status check for EventPlanner on OpenShift (PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "🔍 EventPlanner OpenShift Status Check" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Check if logged in
try {
    $null = oc whoami 2>$null
    Write-Host "✅ Logged into OpenShift" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged into OpenShift. Please run 'oc login' first." -ForegroundColor Red
    exit 1
}

# Switch to eventplanner namespace
try {
    oc project eventplanner 2>$null
} catch {
    Write-Host "❌ eventplanner namespace not found. Please deploy first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Pods Status:" -ForegroundColor White
oc get pods -n eventplanner

Write-Host ""
Write-Host "🌐 Routes:" -ForegroundColor White
oc get routes -n eventplanner

Write-Host ""
Write-Host "🔗 Application URLs:" -ForegroundColor White
$frontendUrl = oc get route frontend-route -o jsonpath='{.spec.host}' -n eventplanner 2>$null
$backendUrl = oc get route backend-route -o jsonpath='{.spec.host}' -n eventplanner 2>$null

if ($frontendUrl) {
    Write-Host "Frontend: https://$frontendUrl" -ForegroundColor Green
} else {
    Write-Host "Frontend: Route not found" -ForegroundColor Red
}

if ($backendUrl) {
    Write-Host "Backend API: https://$backendUrl" -ForegroundColor Green
    Write-Host "API Docs: https://$backendUrl/swagger/" -ForegroundColor Green
    Write-Host "Health Check: https://$backendUrl/healthz" -ForegroundColor Green
} else {
    Write-Host "Backend: Route not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Services:" -ForegroundColor White
oc get services -n eventplanner

Write-Host ""
Write-Host "🏗️  Build Status:" -ForegroundColor White
oc get builds -n eventplanner