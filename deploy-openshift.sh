#!/bin/bash

# OpenShift Deployment Script for EventPlanner
# Make sure you're logged into OpenShift CLI before running this script

set -e

echo "🚀 Starting OpenShift deployment for EventPlanner..."

# Check if oc is installed
if ! command -v oc &> /dev/null; then
    echo "❌ OpenShift CLI (oc) is not installed. Please install it first."
    exit 1
fi

# Check if logged in
if ! oc whoami &> /dev/null; then
    echo "❌ Not logged into OpenShift. Please run 'oc login' first."
    exit 1
fi

echo "✅ OpenShift CLI is ready"

# Create namespace
echo "📦 Creating namespace..."
oc apply -f openshift/namespace.yaml

# Switch to the namespace
oc project eventplanner

# Create ImageStreams and BuildConfigs
echo "🏗️  Creating build configurations..."
oc apply -f openshift/buildconfig-backend.yaml
oc apply -f openshift/buildconfig-frontend.yaml

# Start builds
echo "🔨 Starting backend build..."
oc start-build backend-build --follow

echo "🔨 Starting frontend build..."
oc start-build frontend-build --follow

# Deploy MySQL
echo "🗄️  Deploying MySQL database..."
oc apply -f openshift/mysql-deployment.yaml

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
oc rollout status deployment/mysql -n eventplanner --timeout=300s

# Deploy Backend
echo "🔧 Deploying backend service..."
oc apply -f openshift/backend-deployment.yaml

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
oc rollout status deployment/backend -n eventplanner --timeout=300s

# Deploy Frontend
echo "🎨 Deploying frontend service..."
oc apply -f openshift/frontend-deployment.yaml

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
oc rollout status deployment/frontend -n eventplanner --timeout=300s

# Create routes
echo "🌐 Creating routes..."
oc apply -f openshift/routes.yaml

# Get route URLs
echo "🎉 Deployment completed!"
echo ""
echo "📋 Application URLs:"
echo "Frontend: https://$(oc get route frontend-route -o jsonpath='{.spec.host}')"
echo "Backend API: https://$(oc get route backend-route -o jsonpath='{.spec.host}')"
echo ""
echo "🔍 To check status:"
echo "oc get pods -n eventplanner"
echo "oc get routes -n eventplanner"
echo ""
echo "📊 To view logs:"
echo "oc logs -f deployment/backend -n eventplanner"
echo "oc logs -f deployment/frontend -n eventplanner"
echo "oc logs -f deployment/mysql -n eventplanner"