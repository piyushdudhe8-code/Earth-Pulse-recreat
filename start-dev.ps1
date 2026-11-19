$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$backendScript = Join-Path $projectRoot "scripts\start-backend.ps1"
$frontendScript = Join-Path $projectRoot "scripts\start-frontend.ps1"
$powershell = Join-Path $PSHOME "powershell.exe"

foreach ($script in @($backendScript, $frontendScript)) {
    if (-not (Test-Path $script)) {
        throw "Startup script not found: $script"
    }
}

Start-Process $powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $backendScript
)

Start-Process $powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $frontendScript
)

Write-Host "Opened separate startup windows. Existing services are never terminated; each script reports port conflicts."
