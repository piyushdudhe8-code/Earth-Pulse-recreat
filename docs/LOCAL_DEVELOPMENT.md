# Local development on Windows

## One-time setup

Run these commands from the project root in PowerShell:

```powershell
py -3 -m venv .\backend\venv
& .\backend\venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
Push-Location .\frontend
npm.cmd install
Pop-Location
if (-not (Test-Path .\frontend\.env.local)) {
    Copy-Item .\frontend\.env.local.example .\frontend\.env.local
}
```

The backend virtual environment is `backend\venv` (not a root-level `venv`).
Check that `frontend\.env.local` contains:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Start the services

Open two PowerShell terminals at the project root.

Backend terminal:

```powershell
.\scripts\start-backend.ps1
```

Frontend terminal:

```powershell
.\scripts\start-frontend.ps1
```

The frontend is available at [http://localhost:3000](http://localhost:3000).
The backend is available at [http://127.0.0.1:8000](http://127.0.0.1:8000),
with health at `/health` and interactive API documentation at `/docs`.

The startup scripts check Python/Node, environment files, and occupied ports.
They never terminate an existing process. If a port is already in use, inspect
the reported PID and resolve the conflict yourself. Do not start a second
server on the same port.

The convenience command opens both scripts in separate PowerShell windows:

```powershell
.\start-dev.ps1
```

## Environment and production

Next.js embeds `NEXT_PUBLIC_API_URL` at development startup and production
build time. After changing `frontend\.env.local`, stop and restart the frontend
using `.\scripts\start-frontend.ps1`. The local example uses
`http://127.0.0.1:8000`; the production deployment must set the actual HTTPS
backend URL in the frontend build environment. The backend's
`EARTH_PULSE_CORS_ORIGINS` setting is configured independently with exact
frontend origins. Local defaults allow only `http://localhost:3000` and
`http://127.0.0.1:3000`; production origins must be explicit HTTPS origins.

Do not put NASA, LLM, or other credentials in frontend variables.

## Tests and live NASA check

```powershell
Push-Location .\backend
& .\venv\Scripts\python.exe -m pytest
Pop-Location
Push-Location .\frontend
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
Pop-Location
& .\backend\venv\Scripts\python.exe .\scripts\verify_live_nasa.py
```

The live NASA verification makes real network requests to NASA POWER, its
Projection API, and NASA CMR; it is separate from tests and can fail when an
upstream service or network is unavailable.
