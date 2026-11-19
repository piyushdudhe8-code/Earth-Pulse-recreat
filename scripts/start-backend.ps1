$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $projectRoot "backend"
$pythonCandidates = @(
    (Join-Path $projectRoot "venv\Scripts\python.exe"),
    (Join-Path $backendDirectory "venv\Scripts\python.exe")
)
$python = $pythonCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $python) {
    throw "Python virtual environment not found. Expected venv\Scripts\python.exe or backend\venv\Scripts\python.exe under $projectRoot. Create one and install backend\requirements.txt."
}

$listeners = @(
    Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue
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
    throw "Port 8000 is already in use by $($owners -join ', '). No process was stopped. Inspect the listener or stop it yourself before retrying."
}

Write-Host "Using Python: $python"
Write-Host "Starting Earth Pulse API at http://127.0.0.1:8000"
Push-Location $backendDirectory
try {
    & $python -c "import app.main; import uvicorn"
    if ($LASTEXITCODE -ne 0) {
        throw "Backend imports failed. Review the Python traceback above and confirm backend\requirements.txt is installed in this virtual environment."
    }

    & $python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    if ($LASTEXITCODE -ne 0) {
        throw "Uvicorn exited with code $LASTEXITCODE. Review the startup output above."
    }
} finally {
    Pop-Location
}
