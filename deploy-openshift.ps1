# OpenShift Deployment Script for EventPlanner (PowerShell)
# Make sure you're logged into OpenShift CLI before running this script

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting OpenShift deployment for EventPlanner..." -ForegroundColor Green

# Check if oc is installed
try {
    $null = Get-Command oc -ErrorAction Stop
    Write-Host "✅ OpenShift CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ OpenShift CLI (oc) is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://console-openshift-console.apps.rm3.7wse.p1.openshiftapps.com/" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
try {
    $null = oc whoami 2>$null
    Write-Host "✅ Logged into OpenShift" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged into OpenShift. Please run 'oc login' first." -ForegroundColor Red
    Write-Host "Run: oc login https://api.rm3.7wse.p1.openshiftapps.com:6443" -ForegroundColor Yellow
    exit 1
}

# Create namespace
Write-Host "📦 Creating namespace..." -ForegroundColor Cyan
oc apply -f openshift/namespace.yaml

# Switch to the namespace
oc project eventplanner

# Create ImageStreams and BuildConfigs
Write-Host "🏗️  Creating build configurations..." -ForegroundColor Cyan
oc apply -f openshift/buildconfig-backend.yaml
oc apply -f openshift/buildconfig-frontend.yaml

# Start builds
Write-Host "🔨 Starting backend build..." -ForegroundColor Cyan
oc start-build backend-build --follow

Write-Host "🔨 Starting frontend build..." -ForegroundColor Cyan
oc start-build frontend-build --follow

# Deploy MySQL
Write-Host "🗄️  Deploying MySQL database..." -ForegroundColor Cyan
oc apply -f openshift/mysql-deployment.yaml

# Wait for MySQL to be ready
Write-Host "⏳ Waiting for MySQL to be ready..." -ForegroundColor Yellow
oc rollout status deployment/mysql -n eventplanner --timeout=300s

# Deploy Backend
Write-Host "🔧 Deploying backend service..." -ForegroundColor Cyan
oc apply -f openshift/backend-deployment.yaml

# Wait for backend to be ready
Write-Host "⏳ Waiting for backend to be ready..." -ForegroundColor Yellow
oc rollout status deployment/backend -n eventplanner --timeout=300s

# Deploy Frontend
Write-Host "🎨 Deploying frontend service..." -ForegroundColor Cyan
oc apply -f openshift/frontend-deployment.yaml

# Wait for frontend to be ready
Write-Host "⏳ Waiting for frontend to be ready..." -ForegroundColor Yellow
oc rollout status deployment/frontend -n eventplanner --timeout=300s

# Create routes
Write-Host "🌐 Creating routes..." -ForegroundColor Cyan
oc apply -f openshift/routes.yaml

# Get route URLs
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Application URLs:" -ForegroundColor White
$frontendUrl = oc get route frontend-route -o jsonpath='{.spec.host}' -n eventplanner 2>$null
$backendUrl = oc get route backend-route -o jsonpath='{.spec.host}' -n eventplanner 2>$null

if ($frontendUrl) {
    Write-Host "Frontend: https://$frontendUrl" -ForegroundColor Green
} else {
    Write-Host "Frontend: Route not ready yet" -ForegroundColor Yellow
}

if ($backendUrl) {
    Write-Host "Backend API: https://$backendUrl" -ForegroundColor Green
    Write-Host "API Docs: https://$backendUrl/swagger/" -ForegroundColor Green
} else {
    Write-Host "Backend: Route not ready yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 To check status:" -ForegroundColor White
Write-Host "oc get pods -n eventplanner" -ForegroundColor Gray
Write-Host "oc get routes -n eventplanner" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 To view logs:" -ForegroundColor White
Write-Host "oc logs -f deployment/backend -n eventplanner" -ForegroundColor Gray
Write-Host "oc logs -f deployment/frontend -n eventplanner" -ForegroundColor Gray
Write-Host "oc logs -f deployment/mysql -n eventplanner" -ForegroundColor Gray