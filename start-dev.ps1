$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$ports = @(3000, 8000)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Where-Object { $_.State -in @("Listen", "Bound") }
    $processIds = $connections |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($processId in $processIds) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
        $processTree = @()
        while ($null -ne $process -and $process.ProcessId -ne $PID) {
            $processTree += [int]$process.ProcessId
            $parentId = [int]$process.ParentProcessId
            $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $parentId"
            if ($null -eq $parent -or $parent.CommandLine -notmatch "uvicorn") {
                break
            }
            $process = $parent
        }
        [array]::Reverse($processTree)
        foreach ($processIdToStop in $processTree) {
            Stop-Process -Id $processIdToStop -Force -ErrorAction SilentlyContinue
        }
    }
}

$remainingPorts = @()
$deadline = (Get-Date).AddSeconds(5)
do {
    $remainingPorts = @(
        foreach ($port in $ports) {
            $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                Where-Object { $_.State -in @("Listen", "Bound") }
            if ($connections) {
                $port
            }
        }
    )
    if ($remainingPorts.Count -eq 0) {
        break
    }
    Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)
if ($remainingPorts.Count -gt 0) {
    throw "Could not free port(s): $($remainingPorts -join ', ')."
}

$backendPython = Join-Path $projectRoot "backend\venv\Scripts\python.exe"
$frontendDirectory = Join-Path $projectRoot "frontend"
if (-not (Test-Path $backendPython)) {
    throw "Backend environment not found. Create backend\venv and install backend\requirements.txt first."
}
if (-not (Test-Path (Join-Path $frontendDirectory "node_modules"))) {
    throw "Frontend dependencies not found. Run npm install in frontend first."
}

Start-Process powershell.exe -WorkingDirectory (Join-Path $projectRoot "backend") -ArgumentList @(
    "-NoExit",
    "-Command",
    "& '$backendPython' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
)

Start-Process powershell.exe -WorkingDirectory $frontendDirectory -ArgumentList @(
    "-NoExit",
    "-Command",
    "npm.cmd run dev -- --hostname 0.0.0.0"
)
