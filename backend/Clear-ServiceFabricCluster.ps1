#Requires -Version 5.1
<#
.SYNOPSIS
    Clears the TravelPlannerApp Service Fabric application from the local cluster.

.DESCRIPTION
    This script removes the application instance, waits for the operation to complete,
    unregisters ALL versions of the application type, waits for unregistration,
    and cleans up the application package from the image store to provide a clean slate.

    All Service Fabric cmdlets are executed inline to avoid scope issues with the
    Service Fabric PowerShell module's internal connection state.
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ApplicationName = "fabric:/TravelPlannerApp",
    [string]$ApplicationTypeName = "TravelPlannerAppType",
    [string]$ApplicationPackagePathInImageStore = "TravelPlannerAppPackage",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# --- 1. Ensure SDK module is loaded ---
$sfModule = Get-Module -ListAvailable -Name "ServiceFabric" | Select-Object -First 1
if (-not $sfModule) {
    try {
        Import-Module ServiceFabric -Global -ErrorAction Stop | Out-Null
    } catch {
        Write-Error "Service Fabric PowerShell module not found. Please install the Service Fabric SDK."
    }
}

# --- 2. Connect to cluster ---
# NOTE: Do NOT capture the output into a variable. The Service Fabric module stores
# connection state in a process-wide/internal location, and assigning the result
# to a variable breaks subsequent cmdlet invocations.
Write-Host "Connecting to local Service Fabric cluster..." -ForegroundColor Cyan
try {
    Connect-ServiceFabricCluster -ConnectionEndpoint "localhost:19000" -ErrorAction Stop | Out-Null
    Write-Host "Connected to local cluster successfully." -ForegroundColor Green
} catch {
    Write-Error "Failed to connect to local Service Fabric cluster. Ensure the cluster is running. Details: $_"
}

# --- 3. Remove Application Instance ---
Write-Host "`nStep 1: Removing application instance '$ApplicationName'..." -ForegroundColor Cyan
try {
    $app = Get-ServiceFabricApplication | Where-Object { $_.ApplicationName -eq $ApplicationName }
    if ($app) {
        if ($PSCmdlet.ShouldProcess($ApplicationName, "Remove Service Fabric Application")) {
            Remove-ServiceFabricApplication -ApplicationName $ApplicationName -Force:$Force

            Write-Host "Waiting for application '$ApplicationName' to be fully removed..." -ForegroundColor Cyan
            $timeout = New-TimeSpan -Minutes 5
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            do {
                Start-Sleep -Seconds 3
                $app = Get-ServiceFabricApplication | Where-Object { $_.ApplicationName -eq $ApplicationName }
                if ($stopwatch.Elapsed -gt $timeout) {
                    Write-Error "Timeout waiting for application '$ApplicationName' to be removed."
                }
            } while ($app)
            $stopwatch.Stop()
            Write-Host "Application '$ApplicationName' is fully removed." -ForegroundColor Green
        }
    } else {
        Write-Host "Application '$ApplicationName' not found. Skipping removal." -ForegroundColor Yellow
    }
} catch {
    Write-Warning "Could not remove application instance. Details: $_"
}

# --- 4. Unregister ALL versions of the Application Type ---
Write-Host "`nStep 2: Unregistering all versions of application type '$ApplicationTypeName'..." -ForegroundColor Cyan
try {
    $appTypes = Get-ServiceFabricApplicationType -ApplicationTypeName $ApplicationTypeName
    if ($appTypes) {
        foreach ($type in $appTypes) {
            $version = $type.ApplicationTypeVersion
            if ($PSCmdlet.ShouldProcess("${ApplicationTypeName}:${version}", "Unregister Service Fabric Application Type")) {
                try {
                    Unregister-ServiceFabricApplicationType -ApplicationTypeName $ApplicationTypeName -ApplicationTypeVersion $version -Force:$Force

                    Write-Host "Waiting for application type '$ApplicationTypeName' version '$version' to be fully unregistered..." -ForegroundColor Cyan
                    $timeout = New-TimeSpan -Minutes 5
                    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
                    do {
                        Start-Sleep -Seconds 3
                        $typeCheck = Get-ServiceFabricApplicationType -ApplicationTypeName $ApplicationTypeName | Where-Object { $_.ApplicationTypeVersion -eq $version }
                        if ($stopwatch.Elapsed -gt $timeout) {
                            Write-Error "Timeout waiting for application type '$ApplicationTypeName' version '$version' to be unregistered."
                        }
                    } while ($typeCheck)
                    $stopwatch.Stop()
                    Write-Host "Application type '$ApplicationTypeName' version '$version' is fully unregistered." -ForegroundColor Green
                } catch {
                    Write-Warning "Could not unregister application type '$ApplicationTypeName' version '$version'. It may still be in use. Details: $_"
                }
            }
        }
    } else {
        Write-Host "Application type '$ApplicationTypeName' not found. Skipping unregistration." -ForegroundColor Yellow
    }
} catch {
    Write-Warning "Could not query application types. Details: $_"
}

# --- 5. Remove Application Package from Image Store ---
Write-Host "`nStep 3: Removing application package from image store..." -ForegroundColor Cyan
try {
    if ($PSCmdlet.ShouldProcess($ApplicationPackagePathInImageStore, "Remove Application Package from Image Store")) {
        Remove-ServiceFabricApplicationPackage -ApplicationPackagePathInImageStore $ApplicationPackagePathInImageStore -Force:$Force
        Write-Host "Application package removed from image store successfully." -ForegroundColor Green
    }
} catch {
    if ($_.Exception.Message -match "not found" -or $_.Exception.Message -match "does not exist") {
        Write-Host "Application package '$ApplicationPackagePathInImageStore' not found in image store. Skipping cleanup." -ForegroundColor Yellow
    } else {
        Write-Warning "Could not remove application package from image store. Details: $_"
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Cluster cleanup completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
