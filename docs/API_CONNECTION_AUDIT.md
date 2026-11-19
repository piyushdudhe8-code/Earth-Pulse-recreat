# Earth Pulse API connection audit

## Findings

The reported `Failed to fetch` was caused by the API server not running, not by
FastAPI rejecting the frontend's origin. At audit time, the Next.js frontend
responded on port 3000, but a request to `http://127.0.0.1:8000/health` failed
because there was no listener on port 8000. Starting Uvicorn made the health
route, API calls, and browser analysis work.

There was a related stale-configuration issue: `frontend/.env.local` already
specified `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`, while the already-running
Next.js process had been started before that value was loaded and its compiled
client bundle still used the old `http://localhost:8000` development fallback.
`NEXT_PUBLIC_` values are embedded when Next.js starts or builds. Restarting it
with the configured environment corrected browser requests to
`http://127.0.0.1:8000`. The frontend startup script now checks the local
configuration and explicitly exports that URL before starting Next.js.

The backend's development CORS defaults already allowed both requested browser
origins (`http://localhost:3000` and `http://127.0.0.1:3000`). Actual OPTIONS
preflights from both origins returned the matching
`Access-Control-Allow-Origin`; `GET` and `POST` were allowed, as were
`Content-Type` and `Authorization`. Credentials are disabled, wildcard origins
are rejected, and an unconfigured origin is rejected. CORS was not the
connection-refused root cause.

The routers were imported and registered, including health, analysis,
projection, CMR, geocoding, probability, and research assistant. The backend
was importable in the existing `backend/venv`; that is the actual virtual
environment (there is no root `venv`).

Before the fix, the frontend grouped fetch/network failures under “Could not
connect” without distinguishing a stopped backend from a browser CORS/network
block, used a hardcoded development fallback that could disagree with the
environment file, and could report an unreadable JSON response before
considering the HTTP status. It also described every HTTP 502 from a declared
data source as a NASA failure. These cases are now reported separately.

## Verification results

- `GET /health`: HTTP 200, `{"status":"ok"}`.
- `GET /docs`: HTTP 200.
- Registered routes include `/api/analyze`, `/api/projection/models`,
  `/api/projection/analyze`, `/api/cmr/collections`, `/api/geocode`,
  `/api/probability`, and `/api/research-assistant`.
- CORS preflights from both localhost origins passed for GET and POST with the
  required headers; an unconfigured origin was rejected.
- Real NASA POWER historical temperature retrieval returned 240 monthly records
  from 2006-01 through 2025-12, source `NASA POWER (MERRA-2)`, parameter `T2M`.
- NASA's projection catalog returned seven models. The real projection analysis
  returned six model series for 2050, scenario `ssp245`.
- NASA CMR search for precipitation returned collection metadata. A search for
  the old `GPM_3IMERGDF` title returned no results at audit time, so that
  zero-result query was not treated as an integration failure.
- The standalone `scripts/verify_live_nasa.py` made successful live requests to
  NASA POWER temperature and precipitation, the Projection API, and CMR.
- In the browser, `/investigate` completed geocoding, a real `/api/analyze`
  request, and displayed the returned chart. `/future` completed a real
  projection request and displayed six model lines. Cached historical data was
  labeled cached and was not labeled “NASA DATA VERIFIED.”
- With the backend stopped, the browser displayed “Backend: Unavailable” and a
  connection error identifying the configured API URL; it did not claim NASA
  was unavailable.
- Backend tests: 41 passed. Frontend lint and TypeScript checks passed. A
  production build with `NEXT_PUBLIC_API_URL=https://api.example.com` passed;
  that build's client bundle contained the configured HTTPS address and no
  localhost backend URL.

Browser tests confirmed the historical series and projection charts. The live
projection data was cached on the repeated browser run; the standalone
verification script and first live projection request confirmed actual NASA
upstream retrieval.

## Configuration and security

The local API URL lives in `frontend/.env.local` and is a public address, not a
secret. For production, configure `NEXT_PUBLIC_API_URL` in the frontend
deployment with the HTTPS API origin before building. Configure the backend's
`EARTH_PULSE_CORS_ORIGINS` separately with only the intended HTTPS frontend
origin(s); do not use `*`. NASA requests remain server-side. Optional LLM
credentials belong only in the backend environment, never in `NEXT_PUBLIC_`
variables.
