# EventPlanner OpenShift Deployment Guide

This guide will help you deploy the EventPlanner application (Go backend + Angular frontend + MySQL) to OpenShift.

## Prerequisites

1. **OpenShift CLI (oc)** installed on your machine
2. **Access to OpenShift cluster**: https://console-openshift-console.apps.rm3.7wse.p1.openshiftapps.com/
3. **GitHub repository**: https://github.com/mofarag122/eventplanner-backend-public

## Architecture

The application consists of:
- **Frontend**: Angular app served by nginx (port 80)
- **Backend**: Go API server (port 8080)
- **Database**: MySQL 8.0 (port 3306)

## Deployment Steps

### Step 1: Login to OpenShift

```bash
# Login to your OpenShift cluster
oc login https://api.rm3.7wse.p1.openshiftapps.com:6443
```

### Step 2: Make deployment script executable

```bash
chmod +x deploy-openshift.sh
```

### Step 3: Run the deployment script

```bash
./deploy-openshift.sh
```

This script will:
1. Create the `eventplanner` namespace
2. Set up BuildConfigs for both frontend and backend
3. Build container images from your GitHub repository
4. Deploy MySQL database
5. Deploy backend API
6. Deploy frontend application
7. Create routes for external access

### Step 4: Verify deployment

```bash
# Check all pods are running
oc get pods -n eventplanner

# Check routes
oc get routes -n eventplanner

# Check services
oc get services -n eventplanner
```

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Create namespace
oc apply -f openshift/namespace.yaml
oc project eventplanner

# Create builds
oc apply -f openshift/buildconfig-backend.yaml
oc apply -f openshift/buildconfig-frontend.yaml

# Start builds
oc start-build backend-build --follow
oc start-build frontend-build --follow

# Deploy database
oc apply -f openshift/mysql-deployment.yaml

# Deploy backend
oc apply -f openshift/backend-deployment.yaml

# Deploy frontend
oc apply -f openshift/frontend-deployment.yaml

# Create routes
oc apply -f openshift/routes.yaml
```

## Configuration

### Environment Variables (Backend)

The backend uses these environment variables:
- `HTTP_PORT`: 8080
- `DB_HOST`: mysql-service
- `DB_PORT`: 3306
- `DB_USER`: evoplan
- `DB_PASS`: evoplan
- `DB_NAME`: eventplanner
- `JWT_SECRET`: your-production-jwt-secret-here (⚠️ Change this!)
- `JWT_ISSUER`: eventplanner

### Database Configuration

MySQL is configured with:
- Database: `eventplanner`
- User: `evoplan`
- Password: `evoplan`
- Root password: `evoplan`

## Accessing the Application

After deployment, get the URLs:

```bash
# Frontend URL
echo "Frontend: https://$(oc get route frontend-route -o jsonpath='{.spec.host}' -n eventplanner)"

# Backend API URL
echo "Backend: https://$(oc get route backend-route -o jsonpath='{.spec.host}' -n eventplanner)"
```

## API Endpoints

The backend exposes these endpoints:
- `GET /healthz` - Health check
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /swagger/` - API documentation

## Monitoring and Troubleshooting

### View logs

```bash
# Backend logs
oc logs -f deployment/backend -n eventplanner

# Frontend logs
oc logs -f deployment/frontend -n eventplanner

# Database logs
oc logs -f deployment/mysql -n eventplanner
```

### Scale applications

```bash
# Scale backend
oc scale deployment/backend --replicas=2 -n eventplanner

# Scale frontend
oc scale deployment/frontend --replicas=2 -n eventplanner
```

### Debug pods

```bash
# Get pod details
oc describe pod <pod-name> -n eventplanner

# Execute commands in pod
oc exec -it <pod-name> -n eventplanner -- /bin/sh
```

## Security Considerations

⚠️ **Important**: Before production deployment:

1. **Change JWT_SECRET**: Update the JWT secret in `openshift/backend-deployment.yaml`
2. **Use Secrets**: Convert sensitive environment variables to OpenShift Secrets
3. **Database Security**: Use persistent volumes and proper database credentials
4. **Network Policies**: Implement network policies to restrict pod-to-pod communication

## Updating the Application

To update after code changes:

```bash
# Trigger new builds
oc start-build backend-build -n eventplanner
oc start-build frontend-build -n eventplanner

# Or use webhooks for automatic builds on git push
```

## Cleanup

To remove the entire application:

```bash
oc delete namespace eventplanner
```

## Support

If you encounter issues:
1. Check pod logs: `oc logs -f deployment/<service> -n eventplanner`
2. Check pod status: `oc get pods -n eventplanner`
3. Check events: `oc get events -n eventplanner --sort-by='.lastTimestamp'`