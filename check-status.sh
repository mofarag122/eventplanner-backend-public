#!/bin/bash

# Quick status check for EventPlanner on OpenShift

echo "🔍 EventPlanner OpenShift Status Check"
echo "======================================"

# Check if logged in
if ! oc whoami &> /dev/null; then
    echo "❌ Not logged into OpenShift. Please run 'oc login' first."
    exit 1
fi

# Switch to eventplanner namespace
oc project eventplanner 2>/dev/null || {
    echo "❌ eventplanner namespace not found. Please deploy first."
    exit 1
}

echo ""
echo "📦 Pods Status:"
oc get pods -n eventplanner

echo ""
echo "🌐 Routes:"
oc get routes -n eventplanner

echo ""
echo "🔗 Application URLs:"
FRONTEND_URL=$(oc get route frontend-route -o jsonpath='{.spec.host}' -n eventplanner 2>/dev/null)
BACKEND_URL=$(oc get route backend-route -o jsonpath='{.spec.host}' -n eventplanner 2>/dev/null)

if [ ! -z "$FRONTEND_URL" ]; then
    echo "Frontend: https://$FRONTEND_URL"
else
    echo "Frontend: Route not found"
fi

if [ ! -z "$BACKEND_URL" ]; then
    echo "Backend API: https://$BACKEND_URL"
    echo "API Docs: https://$BACKEND_URL/swagger/"
    echo "Health Check: https://$BACKEND_URL/healthz"
else
    echo "Backend: Route not found"
fi

echo ""
echo "📊 Services:"
oc get services -n eventplanner

echo ""
echo "🏗️  Build Status:"
oc get builds -n eventplanner