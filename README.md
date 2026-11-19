# Earth Pulse

Earth Pulse is a simple, accessible starting point for exploring how Earth's climate is changing. The homepage is available in English and Hindi. The project is organized as a Next.js frontend and a Python/FastAPI backend.

## Requirements

- Node.js 20 or newer and npm
- Python 3.10 or newer

## Start the application on Windows

Open two PowerShell terminals in the project root. After installing the
dependencies as shown below, run:

```powershell
.\scripts\start-backend.ps1
```

In the second terminal:

```powershell
.\scripts\start-frontend.ps1
```

The frontend is at [http://localhost:3000](http://localhost:3000); the API is
at [http://127.0.0.1:8000](http://127.0.0.1:8000), with health and interactive
docs at `/health` and `/docs`. The scripts check their Python/Node setup and
refuse to start when the required port is occupied; they do not stop processes.
To open both in separate windows, run `.\start-dev.ps1`.
See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for environment,
production, test, and live NASA verification commands, and
[docs/API_CONNECTION_AUDIT.md](docs/API_CONNECTION_AUDIT.md) for the connection
audit and verified results.

### One-time setup

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

`frontend\.env.local` is loaded when Next.js starts and should contain
`NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`. Restart the frontend after changing
that value. The checked-in `.env.local.example` is safe to copy and contains no
secrets.

### Analyze NASA POWER data

Send a JSON request to `POST http://localhost:8000/api/analyze`:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8000/api/analyze `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"lat":38.9,"lon":-77.04,"variable":"temperature","frequency":"monthly"}'
```

Set `variable` to `temperature` or `rainfall`. When `start_year` and `end_year` are omitted, the backend discovers the latest complete year from NASA's actual response and selects the latest 20 complete years. Explicit start and end years are also accepted. The response includes the original NASA parameter and unit, source URL, NASA response version, nearest-point geometry, UTC retrieval time, and whether the data was `live` or `cached`. Cached results retain their original retrieval time and are never labeled live. The returned series preserve missing values as `null`; precipitation is not converted from NASA's source units. If NASA POWER cannot provide the requested coverage, the API returns an error with availability details rather than inventing or substituting values. NASA responses are cached for 24 hours in `backend/data/nasa_power_cache.sqlite3` (override the path with `EARTH_PULSE_CACHE_PATH`).

The connected parameters are NASA POWER `T2M` and `PRECTOTCORR`. Monthly meteorological data are MERRA-2 reanalysis, labeled `NASA POWER (MERRA-2)` and `reanalysis / model-derived`; a point query refers to the nearest NASA grid cell, not a city or country average. See the [official NASA POWER monthly API documentation](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/).

### Ask a projection-based future question

The `/future` page uses NASA POWER's Projection API. It discovers the monthly model catalog and compares annual values from returned model projection data for the selected year and scenario. It does **not** calculate or display a probability. Model agreement is not a probability. The NASA ensemble is shown only when individual models have no usable target-year values. Projections are visibly separate from historical observations.

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8000/api/projection/models `
  -Method Get

Invoke-RestMethod `
  -Uri http://localhost:8000/api/projection/analyze `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"lat":39.74,"lon":-104.99,"variable":"temperature","condition":"above","threshold":30,"scenario":"ssp245","target_year":2050}'
```

Projection API reference: [NASA POWER Projection API](https://power.larc.nasa.gov/docs/services/api/projection/). Supported scenario options are `ssp126`, `ssp245`, and `ssp370`. Monthly model availability is fetched from NASA before projection values are requested. NASA documents monthly data for 2015–2100 on a 0.25° grid using nearest-cell selection without interpolation. Missing model values are not filled; incomplete years remain unavailable. Read [NASA_API_INTEGRATION.md](docs/NASA_API_INTEGRATION.md) for documentation findings.

### Search NASA dataset metadata

The Research Assistant and its catalogue search use NASA's CMR collection service (`GET /api/cmr/collections`). Example:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8000/api/cmr/collections?variable=precipitation&topic=Precipitation&start_time=2020-01-01T00%3A00%3A00Z&end_time=2021-01-01T00%3A00%3A00Z&west=-10&south=-5&east=10&north=5"
```

CMR returns collection metadata only (title, short name, version, provider, summary, coverage, concept ID, and official links). Earth Pulse does not download or analyze data from these metadata results. Linked access may require a NASA Earthdata Login. The CMR documentation and field mappings are in [NASA_DATA_PROVENANCE.md](docs/NASA_DATA_PROVENANCE.md).

### Search for a place

`GET http://localhost:8000/api/geocode?q=Washington%20DC` searches place names using OpenStreetMap Nominatim. The interactive maps use OpenStreetMap tiles and include attribution.

### Research assistant and NASA CMR

The Research Lab uses `POST /api/research-assistant` for variable and research-direction suggestions. Dataset recommendations are actual results from a live NASA CMR collection search, not a hardcoded dataset list. CMR is metadata-only; it is not evidence that the underlying dataset was downloaded or analyzed. Without an LLM key, the assistant uses a guided keyword matcher. To enable an optional OpenAI-compatible model, copy `.env.example` to `.env` and set `EARTH_PULSE_LLM_API_KEY` (and, if needed, the API URL and model). The key stays on the backend. The model selects fixed variable and direction IDs; it cannot supply numbers, statistics, or trends. No LLM is used to calculate results.

### Research reports and downloads

After an analysis on `/investigate` or the Multi-variable tool, open `/report` to review the saved results. The snapshot is stored in this browser's local storage; it is not uploaded to the backend. Download the report as a PDF or export the annual data, trend, uncertainty band, source, and version as CSV.

### Demo walkthrough

1. Pick your location on `/investigate` (or search for a place).
2. View the 20-year temperature trend and its data limitations.
3. Compare with another region using the second-place map selection.
4. Ask a future yes/no question on `/future` and choose a NASA scenario; inspect model agreement, not a probability.
5. Open `/report` and download the report or CSV.

The judge-facing 60–90 second walkthrough is in
[docs/JUDGE_DEMO_SCRIPT.md](docs/JUDGE_DEMO_SCRIPT.md).

## Public About page

Visit `/about` for the project overview, historical and future experiences,
data sources, methodology, limitations, team placeholders, and source code
link. Earth Pulse does not require visitor accounts. Historical reports remain
in the visitor's browser.

## Deploy publicly

The deployment configuration is prepared for Vercel (frontend) and Render
(FastAPI backend). Follow the account and environment-variable steps in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Deployment still requires the project
owner to connect the repository through their Vercel and Render accounts. No
live deployment or public URL is claimed here.

After both services have real public URLs, provide them and test the public
site. The results log is [docs/PUBLIC_TEST_RESULTS.md](docs/PUBLIC_TEST_RESULTS.md);
it remains marked not run until those public checks actually happen.

### Live NASA verification (not a unit test)

From the repository root, run:

```powershell
python scripts\verify_live_nasa.py
```

This script makes real requests to POWER temperature and precipitation, discovers projection models and requests projection data, and searches CMR. It is intentionally separate from `pytest`, uses no synthetic fixtures, prints the endpoints and response timestamps/coverage, and exits nonzero if an upstream request or response check fails. Its output is a point-in-time report; do not claim a live request succeeded unless it actually completes successfully.

## Project layout

```text
frontend/  Next.js App Router application, reusable UI components, and design system
backend/   FastAPI application with routers, models, and services
render.yaml  Render Blueprint for the Python API
frontend/vercel.json  Vercel Next.js build configuration
.env.example  Example local backend settings (contains no credentials)
```

The `/investigate` page analyzes temperature or rainfall at a chosen location and can compare two locations. The `/future` page compares a visitor's yes/no threshold with NASA scenario-based climate projections and reports model agreement without inventing a probability. The `/lab` page offers guided research, real NASA CMR metadata search, and multi-variable historical analysis; currently only temperature and rainfall are connected, and soil moisture is shown as unavailable. `/methodology` explains the data and methods in simple language; `/about` describes the project, sources, limitations, team placeholders, and source repository. Historical analysis uses NASA POWER; projection data uses NASA POWER's Projection API; CMR is metadata-only. Missing values are reported rather than generated or substituted. Historical trend testing uses complete annual values to avoid mistaking seasonal cycles for long-term trends. Results describe patterns in the data and do not identify their causes.

Run backend tests from the `backend` folder with:

```powershell
pytest
```

The real-data audit and documented resolutions are in [docs/REAL_DATA_AUDIT.md](docs/REAL_DATA_AUDIT.md). Read [NASA_DATA_PROVENANCE.md](docs/NASA_DATA_PROVENANCE.md), [SCIENTIFIC_METHODOLOGY.md](docs/SCIENTIFIC_METHODOLOGY.md), and [DATA_LIMITATIONS.md](docs/DATA_LIMITATIONS.md) for source and method details.

The local API connectivity findings, checks, and troubleshooting steps are in
[docs/API_CONNECTION_AUDIT.md](docs/API_CONNECTION_AUDIT.md) and
[docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md).

## Environment settings

- The frontend reads `frontend/.env.local`. Copy `frontend/.env.example` to
  `frontend/.env.local` for local development; it sets
  `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`. For production, set it in Vercel
  to the actual Render API origin before redeploying. This is a public URL,
  not a secret.
- The backend reads the repository-root `.env`. Configure
  `EARTH_PULSE_CORS_ORIGINS` with the exact browser origin(s); local defaults
  allow ports 3000 on localhost. Production values must be explicit HTTPS
  origins. Wildcards are rejected.
- `EARTH_PULSE_LLM_API_KEY` is optional and backend-only. Never put it in a
  `NEXT_PUBLIC_` variable or commit it. The core data and guided research
  suggestions work without an external model.

See [.env.example](.env.example), [frontend/.env.example](frontend/.env.example),
and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for variable details.

## Known limitations

- The connected environmental variables are monthly temperature and precipitation; soil moisture is not available in the current provider.
- NASA POWER's current point records are model-derived MERRA-2 reanalysis, not direct measurements at a household or exact map point.
- Monthly values cannot resolve daily extremes. Climate projections are scenario-based and are not official forecasts or probability estimates.
- The report snapshot is local to one browser. The generated PDF uses jsPDF's built-in Latin font; Hindi text in a custom report question may not render correctly in the PDF, while the on-page report and UTF-8 CSV retain the text.
- The optional model provides fixed-category research suggestions only. It does not calculate, explain, or receive climate trends.
- CMR metadata search does not download or analyze a dataset; linked resources may require NASA Earthdata Login.
