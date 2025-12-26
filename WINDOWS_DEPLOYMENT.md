# EventPlanner OpenShift Deployment - Windows Guide

This guide is specifically for Windows users deploying to OpenShift.

## Prerequisites

1. **OpenShift CLI (oc)** - Download from your OpenShift console
2. **PowerShell** (comes with Windows)
3. **Git** (if not already installed)

## Step-by-Step Deployment

### Step 1: Install OpenShift CLI

1. Go to your OpenShift console: https://console-openshift-console.apps.rm3.7wse.p1.openshiftapps.com/
2. Click the **?** (help) icon in the top right
3. Select **Command Line Tools**
4. Download **oc - OpenShift Command Line Interface**
5. Extract the `oc.exe` file to a folder in your PATH (e.g., `C:\Windows\System32` or create a new folder and add it to PATH)

### Step 2: Verify Installation

Open PowerShell and run:
```powershell
oc version
```

You should see version information.

### Step 3: Login to OpenShift

```powershell
oc login https://api.rm3.7wse.p1.openshiftapps.com:6443
```

Enter your username and password when prompted.

### Step 4: Deploy Using PowerShell Script

**Option A: Run the PowerShell script**
```powershell
# Navigate to your project directory
cd "D:\Haban\Work\UNI\Year 4\Tools 3\eventplanner-backend-public"

# Run the deployment script
.\deploy-openshift.ps1
```

**Option B: If script execution is blocked**

If you get an execution policy error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then try running the script again.

### Step 5: Manual Deployment (If Script Fails)

If the PowerShell script doesn't work, deploy manually:

```powershell
# 1. Create namespace
oc apply -f openshift/namespace.yaml
oc project eventplanner

# 2. Create builds
oc apply -f openshift/buildconfig-backend.yaml
oc apply -f openshift/buildconfig-frontend.yaml

# 3. Start builds (these will take several minutes)
oc start-build backend-build --follow
oc start-build frontend-build --follow

# 4. Deploy database
oc apply -f openshift/mysql-deployment.yaml

# 5. Wait for MySQL (check status)
oc get pods -n eventplanner

# 6. Deploy backend
oc apply -f openshift/backend-deployment.yaml

# 7. Deploy frontend
oc apply -f openshift/frontend-deployment.yaml

# 8. Create routes
oc apply -f openshift/routes.yaml
```

### Step 6: Check Status

```powershell
# Run status check script
.\check-status.ps1

# Or manually check
oc get pods -n eventplanner
oc get routes -n eventplanner
```

### Step 7: Get Your Application URLs

```powershell
# Get frontend URL
$frontendUrl = oc get route frontend-route -o jsonpath='{.spec.host}' -n eventplanner
Write-Host "Frontend: https://$frontendUrl"

# Get backend URL
$backendUrl = oc get route backend-route -o jsonpath='{.spec.host}' -n eventplanner
Write-Host "Backend: https://$backendUrl"
Write-Host "API Docs: https://$backendUrl/swagger/"
```

## Troubleshooting

### Common Issues

1. **"oc is not recognized"**
   - Make sure oc.exe is in your PATH
   - Try using the full path: `C:\path\to\oc.exe`

2. **"Execution policy error"**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **"Not logged in"**
   ```powershell
   oc login https://api.rm3.7wse.p1.openshiftapps.com:6443
   ```

4. **Build failures**
   ```powershell
   # Check build logs
   oc logs -f build/backend-build-1 -n eventplanner
   oc logs -f build/frontend-build-1 -n eventplanner
   ```

5. **Pods not starting**
   ```powershell
   # Check pod details
   oc describe pod <pod-name> -n eventplanner
   
   # Check logs
   oc logs <pod-name> -n eventplanner
   ```

### Useful Commands

```powershell
# Check all resources
oc get all -n eventplanner

# Check events
oc get events -n eventplanner --sort-by='.lastTimestamp'

# Scale applications
oc scale deployment/backend --replicas=2 -n eventplanner

# Delete everything
oc delete namespace eventplanner
```

## Expected Timeline

- **Builds**: 5-10 minutes each (backend and frontend)
- **Database startup**: 1-2 minutes
- **Application startup**: 1-2 minutes each
- **Total deployment time**: 15-20 minutes

## Success Indicators

✅ All pods show "Running" status
✅ Routes are created and accessible
✅ Frontend loads in browser
✅ Backend API responds at `/healthz`
✅ Swagger docs available at `/swagger/`

## Next Steps

After successful deployment:
1. Test the application functionality
2. Set up monitoring and logging
3. Configure proper secrets for production
4. Set up CI/CD pipelines for automatic deployments