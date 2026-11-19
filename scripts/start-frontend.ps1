$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDirectory = Join-Path $projectRoot "frontend"
$envFile = Join-Path $frontendDirectory ".env.local"
$envExample = Join-Path $frontendDirectory ".env.local.example"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js was not found on PATH. Install Node.js 20 or newer, open a new PowerShell window, and retry."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm.cmd was not found on PATH. Install Node.js with npm and open a new PowerShell window."
}

$nodeVersion = (& node --version).TrimStart("v")
$nodeMajor = 0
if (-not [int]::TryParse(($nodeVersion -split "\.")[0], [ref]$nodeMajor) -or $nodeMajor -lt 20) {
    throw "Node.js 20 or newer is required; found $nodeVersion."
}

if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $envExample)) {
        throw "Frontend configuration example not found: $envExample"
    }
    Copy-Item $envExample $envFile
    Write-Host "Created frontend\.env.local from frontend\.env.local.example"
}
if (-not (Test-Path (Join-Path $frontendDirectory "node_modules"))) {
    throw "Frontend dependencies are missing. Run npm.cmd install from the frontend directory first."
}

$configuredApiUrl = Get-Content $envFile |
    Where-Object { $_ -match "^\s*NEXT_PUBLIC_API_URL\s*=" } |
    Select-Object -Last 1
if (-not $configuredApiUrl -or $configuredApiUrl -notmatch "=\s*['""]?http://127\.0\.0\.1:8000/?['""]?\s*$") {
    throw "frontend\.env.local must set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 for this local startup script. NEXT_PUBLIC values are embedded when Next.js starts; restart the frontend after changing it."
}
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:8000"

$listeners = @(
    Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
)
if ($listeners.Count -gt 0) {
    $owners = $listeners |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object {
            $process = Get-CimInstance Win32_Process -Filter "ProcessId = $_" -ErrorAction SilentlyContinue
            if ($process) {
                "PID $($process.ProcessId) ($($process.Name))"
            } else {
                "PID $_"
            }
        }
    throw "Port 3000 is already in use by $($owners -join ', '). No process was stopped. Use the existing frontend or inspect the listener before retrying."
}

Write-Host "Using Node.js $nodeVersion and frontend\.env.local"
Write-Host "Starting Earth Pulse frontend at http://localhost:3000"
Push-Location $frontendDirectory
try {
    & npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
    if ($LASTEXITCODE -ne 0) {
        throw "Next.js exited with code $LASTEXITCODE. Review the startup output above."
    }
} finally {
    Pop-Location
}
