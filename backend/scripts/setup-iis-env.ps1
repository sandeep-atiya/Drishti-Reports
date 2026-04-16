# Run this script ONCE on the IIS server as Administrator.
# It sets all required environment variables at the Machine level
# so iisnode can read them, then restarts the IIS App Pool.
#
# Usage:
#   Right-click PowerShell → Run as Administrator
#   cd to this scripts\ folder, then:
#   .\setup-iis-env.ps1 -AppPoolName "YourAppPoolName"

param(
    [string]$AppPoolName = "DrishtiReports"   # <-- change to your actual IIS App Pool name
)

$vars = @{
    "NODE_ENV"               = "production"
    "PORT"                   = "5001"

    # MSSQL
    "MSSQL_HOST"             = "192.168.10.177"
    "MSSQL_PORT"             = "1433"
    "MSSQL_USER"             = "sa"
    "MSSQL_PASSWORD"         = 'Atiya@#$&!2025@#'
    "MSSQL_DB"               = "DristhiSoftTechDB"
    "MSSQL_ENCRYPT"          = "false"
    "MSSQL_TRUST_CERT"       = "true"
    "MSSQL_POOL_MAX"         = "100"
    "MSSQL_POOL_MIN"         = "10"
    "MSSQL_POOL_IDLE"        = "60000"

    # Redis
    "REDIS_HOST"             = "127.0.0.1"
    "REDIS_PORT"             = "6379"
    "REDIS_PASSWORD"         = ""

    # Sync / async thresholds
    "LARGE_RANGE_DAYS"       = "90"
    "SYNC_INTERVAL_MINUTES"  = "60"

    # JWT
    "JWT_SECRET"             = "Drishti@Reports#SecretKey!2025$"
    "JWT_EXPIRES_IN"         = "8h"

    # AES
    "AES_KEY"                = "ThisIsAKeyForEncryptAndDecryptTheText"
    "AES_SALT"               = "49,76,61,6e,20,4d,65,64,76,65,64,65,76"

    # PostgreSQL
    "PG_HOST"                = "192.168.3.233"
    "PG_PORT"                = "5432"
    "PG_USER"                = "postgres"
    "PG_PASSWORD"            = "Atiya@123#"
    "PG_DB"                  = "reportsdb"
    "PG_POOL_MAX"            = "100"
    "PG_POOL_MIN"            = "10"
    "PG_POOL_IDLE"           = "60000"
}

Write-Host "Setting system environment variables..." -ForegroundColor Cyan
foreach ($key in $vars.Keys) {
    [System.Environment]::SetEnvironmentVariable($key, $vars[$key], "Machine")
    Write-Host "  SET $key" -ForegroundColor Green
}

Write-Host ""
Write-Host "Restarting IIS App Pool: $AppPoolName" -ForegroundColor Cyan
Import-Module WebAdministration -ErrorAction SilentlyContinue

$pool = Get-Item "IIS:\AppPools\$AppPoolName" -ErrorAction SilentlyContinue
if ($pool) {
    Stop-WebAppPool -Name $AppPoolName
    Start-Sleep -Seconds 2
    Start-WebAppPool -Name $AppPoolName
    Write-Host "  App Pool restarted." -ForegroundColor Green
} else {
    Write-Host "  App Pool '$AppPoolName' not found. Doing full IIS reset instead..." -ForegroundColor Yellow
    iisreset /restart
}

Write-Host ""
Write-Host "Done. Environment variables are active for all new IIS worker processes." -ForegroundColor Cyan
