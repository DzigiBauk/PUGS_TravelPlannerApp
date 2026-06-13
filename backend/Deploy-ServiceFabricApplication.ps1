#Requires -Version 5.1
<#
.SYNOPSIS
    Builds, packages, and deploys TravelPlannerApp to a Microsoft Service Fabric cluster.

.DESCRIPTION
    This script builds the backend solution, creates a fresh Service Fabric application
    package from the application and service manifests, uploads/registers it in the
    cluster image store, and either creates the application or upgrades the existing one.

    By default it reads the cluster endpoint and application parameter file from the
    local publish profile.

.EXAMPLE
    .\Deploy-ServiceFabricApplication.ps1

.EXAMPLE
    .\Deploy-ServiceFabricApplication.ps1 -ApplicationTypeVersion 1.6.0

.EXAMPLE
    .\Deploy-ServiceFabricApplication.ps1 -ClusterConnectionEndpoint mycluster.westeurope.cloudapp.azure.com:19000 -DeployMode Upgrade

.EXAMPLE
    .\Deploy-ServiceFabricApplication.ps1 -PackageOnly
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$SolutionPath = (Join-Path $PSScriptRoot "TravelPlannerApp.slnx"),
    [string]$ApplicationProjectPath = (Join-Path $PSScriptRoot "TravelPlannerApp"),
    [string]$PackagePath = (Join-Path $PSScriptRoot "TravelPlannerAppPackage"),
    [string]$PublishProfilePath = (Join-Path $PSScriptRoot "TravelPlannerApp\PublishProfiles\Local.1Node.xml"),
    [string]$Configuration = "Release",
    [string]$TargetFramework = "net10.0",
    [string]$ClusterConnectionEndpoint,
    [string]$ApplicationName = "fabric:/TravelPlannerApp",
    [string]$ApplicationPackagePathInImageStore = "TravelPlannerAppPackage",
    [string]$ApplicationTypeVersion,
    [string]$JwtSecret,
    [string]$AdminEmail,
    [string]$AdminPassword,
    [string]$AdminName = "Administrator",
    [string]$TravelPlanServiceUrl,
    [string]$TravelPlanServiceInternalApiKey,
    [string]$RouteServiceUrl,
    [string]$RouteServiceInternalApiKey,
    [string]$EnvironmentFilePath = (Join-Path $PSScriptRoot ".env"),
    [ValidateSet("Auto", "New", "Upgrade")]
    [string]$DeployMode = "Auto",
    [switch]$SkipBuild,
    [switch]$PackageOnly,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Import-ServiceFabricModule {
    $sfModule = Get-Module -ListAvailable -Name "ServiceFabric" | Select-Object -First 1
    if (-not $sfModule) {
        throw "Service Fabric PowerShell module was not found. Install the Service Fabric SDK and try again."
    }

    Import-Module ServiceFabric -Global -ErrorAction Stop | Out-Null
}

function Read-XmlDocument {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file was not found: $Path"
    }

    $xml = New-Object System.Xml.XmlDocument
    $xml.PreserveWhitespace = $true
    $xml.Load((Resolve-Path -LiteralPath $Path))
    return $xml
}

function Get-EnvironmentFileValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Names
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmedLine = $line.Trim()
        if (-not $trimmedLine -or $trimmedLine.StartsWith("#")) {
            continue
        }

        $separatorIndex = $trimmedLine.IndexOf("=")
        if ($separatorIndex -lt 1) {
            continue
        }

        $name = $trimmedLine.Substring(0, $separatorIndex).Trim()
        if ($Names -notcontains $name) {
            continue
        }

        $value = $trimmedLine.Substring($separatorIndex + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        return $value
    }

    return $null
}

if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
    $JwtSecret = $env:TRAVELPLANNER_JWT_SECRET
}
if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
    $JwtSecret = Get-EnvironmentFileValue `
        -Path $EnvironmentFilePath `
        -Names @("TRAVELPLANNER_JWT_SECRET", "JwtSettings__Secret")
}

if ([string]::IsNullOrWhiteSpace($AdminEmail)) {
    $AdminEmail = $env:TRAVELPLANNER_ADMIN_EMAIL
}
if ([string]::IsNullOrWhiteSpace($AdminEmail)) {
    $AdminEmail = Get-EnvironmentFileValue -Path $EnvironmentFilePath -Names @("TRAVELPLANNER_ADMIN_EMAIL", "ADMIN_EMAIL", "AdminBootstrap__Email")
}

if ([string]::IsNullOrWhiteSpace($AdminPassword)) {
    $AdminPassword = $env:TRAVELPLANNER_ADMIN_PASSWORD
}
if ([string]::IsNullOrWhiteSpace($AdminPassword)) {
    $AdminPassword = Get-EnvironmentFileValue -Path $EnvironmentFilePath -Names @("TRAVELPLANNER_ADMIN_PASSWORD", "ADMIN_PASSWORD", "AdminBootstrap__Password")
}

if ($AdminName -eq "Administrator") {
    $configuredAdminName = Get-EnvironmentFileValue -Path $EnvironmentFilePath -Names @("TRAVELPLANNER_ADMIN_NAME", "ADMIN_NAME", "AdminBootstrap__Name")
    if (-not [string]::IsNullOrWhiteSpace($configuredAdminName)) {
        $AdminName = $configuredAdminName
    }
}

if ([string]::IsNullOrWhiteSpace($TravelPlanServiceUrl)) {
    $TravelPlanServiceUrl = $env:TRAVEL_PLAN_SERVICE_URL
}
if ([string]::IsNullOrWhiteSpace($TravelPlanServiceUrl)) {
    $TravelPlanServiceUrl = Get-EnvironmentFileValue -Path $EnvironmentFilePath -Names @("TRAVEL_PLAN_SERVICE_URL", "TravelPlanService__BaseUrl")
}

if ([string]::IsNullOrWhiteSpace($TravelPlanServiceInternalApiKey)) {
    $TravelPlanServiceInternalApiKey = $env:TRAVEL_PLAN_SERVICE_INTERNAL_API_KEY
}
if ([string]::IsNullOrWhiteSpace($TravelPlanServiceInternalApiKey)) {
    $TravelPlanServiceInternalApiKey = Get-EnvironmentFileValue `
        -Path $EnvironmentFilePath `
        -Names @("TRAVEL_PLAN_SERVICE_INTERNAL_API_KEY", "TravelPlanService__InternalApiKey")
}

if ([string]::IsNullOrWhiteSpace($RouteServiceUrl)) {
    $RouteServiceUrl = $env:ROUTE_SERVICE_URL
}
if ([string]::IsNullOrWhiteSpace($RouteServiceUrl)) {
    $RouteServiceUrl = Get-EnvironmentFileValue -Path $EnvironmentFilePath -Names @("ROUTE_SERVICE_URL", "RouteService__BaseUrl")
}

if ([string]::IsNullOrWhiteSpace($RouteServiceInternalApiKey)) {
    $RouteServiceInternalApiKey = $env:ROUTE_SERVICE_INTERNAL_API_KEY
}
if ([string]::IsNullOrWhiteSpace($RouteServiceInternalApiKey)) {
    $RouteServiceInternalApiKey = Get-EnvironmentFileValue `
        -Path $EnvironmentFilePath `
        -Names @("ROUTE_SERVICE_INTERNAL_API_KEY", "RouteService__InternalApiKey", "InternalApi__Key")
}

if (-not $PackageOnly) {
    if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
        throw "JWT signing secret is required. Set TRAVELPLANNER_JWT_SECRET, configure JwtSettings__Secret in backend/.env, or pass -JwtSecret."
    }
    if ($JwtSecret.Length -lt 32) {
        throw "JWT signing secret must contain at least 32 characters."
    }
    if ([string]::IsNullOrWhiteSpace($AdminEmail) -or $AdminEmail -notmatch "^[^@\s]+@[^@\s]+\.[^@\s]+$") {
        throw "A valid bootstrap admin email is required. Set ADMIN_EMAIL or pass -AdminEmail."
    }
    if ([string]::IsNullOrWhiteSpace($AdminPassword) -or $AdminPassword.Length -lt 12) {
        throw "Bootstrap admin password must contain at least 12 characters. Set ADMIN_PASSWORD or pass -AdminPassword."
    }
    if (-not [Uri]::IsWellFormedUriString($TravelPlanServiceUrl, [UriKind]::Absolute)) {
        throw "TravelPlanService URL is required and must be absolute. Set TRAVEL_PLAN_SERVICE_URL or pass -TravelPlanServiceUrl."
    }
    if ([string]::IsNullOrWhiteSpace($TravelPlanServiceInternalApiKey) -or $TravelPlanServiceInternalApiKey.Length -lt 32) {
        throw "TravelPlanService internal API key must contain at least 32 characters. Set TRAVEL_PLAN_SERVICE_INTERNAL_API_KEY or pass -TravelPlanServiceInternalApiKey."
    }
    if (-not [Uri]::IsWellFormedUriString($RouteServiceUrl, [UriKind]::Absolute)) {
        throw "RouteService URL is required and must be absolute. Set ROUTE_SERVICE_URL or pass -RouteServiceUrl."
    }
    if ([string]::IsNullOrWhiteSpace($RouteServiceInternalApiKey) -or $RouteServiceInternalApiKey.Length -lt 32) {
        throw "RouteService internal API key must contain at least 32 characters. Set ROUTE_SERVICE_INTERNAL_API_KEY or pass -RouteServiceInternalApiKey."
    }
}

function Set-ManifestVersion {
    param(
        [Parameter(Mandatory = $true)][System.Xml.XmlDocument]$Xml,
        [Parameter(Mandatory = $true)][string]$Version
    )

    $root = $Xml.DocumentElement

    if ($root.LocalName -eq "ApplicationManifest") {
        $root.SetAttribute("ApplicationTypeVersion", $Version)
        $refs = $Xml.SelectNodes("//*[local-name()='ServiceManifestRef']")
        foreach ($ref in $refs) {
            $ref.SetAttribute("ServiceManifestVersion", $Version)
        }
    } elseif ($root.LocalName -eq "ServiceManifest") {
        $root.SetAttribute("Version", $Version)
        $packages = $Xml.SelectNodes("//*[local-name()='CodePackage' or local-name()='ConfigPackage' or local-name()='DataPackage']")
        foreach ($package in $packages) {
            $package.SetAttribute("Version", $Version)
        }
    }
}

function Get-ApplicationParameters {
    param([string]$Path)

    $parameters = @{}
    if (-not $Path -or -not (Test-Path -LiteralPath $Path)) {
        return $parameters
    }

    $xml = Read-XmlDocument -Path $Path
    $nodes = $xml.SelectNodes("//*[local-name()='Parameter']")
    foreach ($node in $nodes) {
        $parameters[$node.GetAttribute("Name")] = $node.GetAttribute("Value")
    }

    return $parameters
}

function Copy-ServicePackage {
    param(
        [Parameter(Mandatory = $true)][System.Xml.XmlElement]$ServiceManifestRef,
        [Parameter(Mandatory = $true)][string]$DestinationPackageRoot,
        [string]$Version
    )

    $serviceManifestName = $ServiceManifestRef.GetAttribute("ServiceManifestName")
    if (-not $serviceManifestName.EndsWith("Pkg")) {
        throw "Cannot infer service project name from service manifest '$serviceManifestName'. Expected a name ending in 'Pkg'."
    }

    $serviceProjectName = $serviceManifestName.Substring(0, $serviceManifestName.Length - 3)
    $serviceProjectPath = Join-Path $PSScriptRoot $serviceProjectName
    $sourceManifestPath = Join-Path $serviceProjectPath "PackageRoot\ServiceManifest.xml"
    $buildOutputPath = Join-Path $serviceProjectPath "bin\$Configuration\$TargetFramework"
    $destinationServicePath = Join-Path $DestinationPackageRoot $serviceManifestName
    $destinationCodePath = Join-Path $destinationServicePath "Code"
    $destinationConfigPath = Join-Path $destinationServicePath "Config"

    if (-not (Test-Path -LiteralPath $sourceManifestPath)) {
        throw "Service manifest was not found for $serviceProjectName at $sourceManifestPath"
    }

    if (-not (Test-Path -LiteralPath $buildOutputPath)) {
        throw "Build output was not found for $serviceProjectName at $buildOutputPath"
    }

    New-Item -ItemType Directory -Path $destinationCodePath -Force | Out-Null
    New-Item -ItemType Directory -Path $destinationConfigPath -Force | Out-Null

    $serviceManifest = Read-XmlDocument -Path $sourceManifestPath
    if ($Version) {
        Set-ManifestVersion -Xml $serviceManifest -Version $Version
    }
    $serviceManifest.Save((Join-Path $destinationServicePath "ServiceManifest.xml"))

    Copy-Item -Path (Join-Path $buildOutputPath "*") -Destination $destinationCodePath -Recurse -Force

    $appSettingsPath = Join-Path $serviceProjectPath "appsettings.json"
    if (Test-Path -LiteralPath $appSettingsPath) {
        Copy-Item -LiteralPath $appSettingsPath -Destination $destinationConfigPath -Force
    }
}

if (-not (Test-Path -LiteralPath $PublishProfilePath)) {
    throw "Publish profile was not found: $PublishProfilePath"
}

$publishProfile = Read-XmlDocument -Path $PublishProfilePath
$publishNamespace = New-Object System.Xml.XmlNamespaceManager($publishProfile.NameTable)
$publishNamespace.AddNamespace("fabrictools", "http://schemas.microsoft.com/2015/05/fabrictools")

$clusterNode = $publishProfile.SelectSingleNode("//fabrictools:ClusterConnectionParameters", $publishNamespace)
if (-not $ClusterConnectionEndpoint -and $clusterNode) {
    $ClusterConnectionEndpoint = $clusterNode.GetAttribute("ConnectionEndpoint")
}
if (-not $ClusterConnectionEndpoint) {
    $ClusterConnectionEndpoint = "localhost:19000"
}

$parameterNode = $publishProfile.SelectSingleNode("//fabrictools:ApplicationParameterFile", $publishNamespace)
$applicationParameterPath = $null
if ($parameterNode) {
    $rawParameterPath = $parameterNode.GetAttribute("Path")
    if ($rawParameterPath) {
        $applicationParameterPath = Join-Path (Split-Path -Parent $PublishProfilePath) $rawParameterPath
        $applicationParameterPath = [System.IO.Path]::GetFullPath($applicationParameterPath)
    }
}

$sourceApplicationManifestPath = Join-Path $ApplicationProjectPath "ApplicationPackageRoot\ApplicationManifest.xml"
$applicationManifest = Read-XmlDocument -Path $sourceApplicationManifestPath

if (-not $ApplicationTypeVersion) {
    $ApplicationTypeVersion = $applicationManifest.DocumentElement.GetAttribute("ApplicationTypeVersion")
}
if (-not $ApplicationTypeVersion) {
    throw "Application type version could not be read from $sourceApplicationManifestPath. Pass -ApplicationTypeVersion explicitly."
}

$applicationTypeName = $applicationManifest.DocumentElement.GetAttribute("ApplicationTypeName")
if (-not $applicationTypeName) {
    throw "Application type name could not be read from $sourceApplicationManifestPath."
}

if (-not $SkipBuild) {
    Write-Host "Building backend solution ($Configuration)..." -ForegroundColor Cyan
    dotnet build $SolutionPath -c $Configuration
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE."
    }
}

Write-Host "Creating Service Fabric application package..." -ForegroundColor Cyan
if (Test-Path -LiteralPath $PackagePath) {
    Remove-Item -LiteralPath $PackagePath -Recurse -Force
}
New-Item -ItemType Directory -Path $PackagePath -Force | Out-Null

Set-ManifestVersion -Xml $applicationManifest -Version $ApplicationTypeVersion
$applicationManifest.Save((Join-Path $PackagePath "ApplicationManifest.xml"))

$serviceManifestRefs = $applicationManifest.SelectNodes("//*[local-name()='ServiceManifestRef']")
foreach ($serviceManifestRef in $serviceManifestRefs) {
    Copy-ServicePackage -ServiceManifestRef $serviceManifestRef -DestinationPackageRoot $PackagePath -Version $ApplicationTypeVersion
}

$applicationParameters = Get-ApplicationParameters -Path $applicationParameterPath
if ($JwtSecret) {
    $applicationParameters["JwtSettings_Secret"] = $JwtSecret
}
if ($AdminEmail) {
    $applicationParameters["AdminBootstrap_Email"] = $AdminEmail
}
if ($AdminPassword) {
    $applicationParameters["AdminBootstrap_Password"] = $AdminPassword
}
if ($AdminName) {
    $applicationParameters["AdminBootstrap_Name"] = $AdminName
}
if ($TravelPlanServiceUrl) {
    $applicationParameters["TravelPlanService_Url"] = $TravelPlanServiceUrl
}
if ($TravelPlanServiceInternalApiKey) {
    $applicationParameters["TravelPlanService_InternalApiKey"] = $TravelPlanServiceInternalApiKey
}
if ($RouteServiceUrl) {
    $applicationParameters["RouteService_Url"] = $RouteServiceUrl
}
if ($RouteServiceInternalApiKey) {
    $applicationParameters["RouteService_InternalApiKey"] = $RouteServiceInternalApiKey
}

if ($PackageOnly) {
    Write-Host "Package created at $PackagePath." -ForegroundColor Green
    return
}

Import-ServiceFabricModule

Write-Host "Connecting to Service Fabric cluster at $ClusterConnectionEndpoint..." -ForegroundColor Cyan
Connect-ServiceFabricCluster -ConnectionEndpoint $ClusterConnectionEndpoint | Out-Null

if ($PSCmdlet.ShouldProcess($ApplicationPackagePathInImageStore, "Upload and register Service Fabric application package")) {
    Write-Host "Uploading package to the cluster image store..." -ForegroundColor Cyan
    Copy-ServiceFabricApplicationPackage `
        -ApplicationPackagePath $PackagePath `
        -ApplicationPackagePathInImageStore $ApplicationPackagePathInImageStore `
        -TimeoutSec 300 `
        -ErrorAction Stop

    Write-Host "Registering application type $applicationTypeName version $ApplicationTypeVersion..." -ForegroundColor Cyan
    Register-ServiceFabricApplicationType `
        -ApplicationPathInImageStore $ApplicationPackagePathInImageStore `
        -TimeoutSec 300 `
        -ErrorAction Stop
}

$existingApplication = Get-ServiceFabricApplication | Where-Object { $_.ApplicationName -eq $ApplicationName }
if ($DeployMode -eq "Auto") {
    $DeployMode = if ($existingApplication) { "Upgrade" } else { "New" }
}

if ($DeployMode -eq "New" -and $existingApplication -and -not $Force) {
    throw "Application $ApplicationName already exists. Use -DeployMode Upgrade, -DeployMode Auto, or pass -Force to remove it before creating a new instance."
}

if ($DeployMode -eq "New") {
    if ($existingApplication -and $Force) {
        Write-Host "Removing existing application before fresh deployment..." -ForegroundColor Yellow
        Remove-ServiceFabricApplication -ApplicationName $ApplicationName -Force
    }

    Write-Host "Creating application $ApplicationName..." -ForegroundColor Cyan
    New-ServiceFabricApplication `
        -ApplicationName $ApplicationName `
        -ApplicationTypeName $applicationTypeName `
        -ApplicationTypeVersion $ApplicationTypeVersion `
        -ApplicationParameter $applicationParameters `
        -ErrorAction Stop | Out-Null
} else {
    Write-Host "Upgrading application $ApplicationName to version $ApplicationTypeVersion..." -ForegroundColor Cyan
    Start-ServiceFabricApplicationUpgrade `
        -ApplicationName $ApplicationName `
        -ApplicationTypeVersion $ApplicationTypeVersion `
        -ApplicationParameter $applicationParameters `
        -HealthCheckStableDurationSec 60 `
        -UpgradeDomainTimeoutSec 1200 `
        -UpgradeTimeoutSec 3000 `
        -FailureAction Rollback `
        -Monitored `
        -ErrorAction Stop | Out-Null
}

Write-Host "Deployment command completed." -ForegroundColor Green
$application = Get-ServiceFabricApplication -ApplicationName $ApplicationName
Write-Host "Application status: $($application.ApplicationStatus); health: $($application.HealthState)"
Get-ServiceFabricService -ApplicationName $ApplicationName |
    Select-Object ServiceName, ServiceStatus, HealthState |
    Format-Table -AutoSize
