# Earth Pulse

Earth Pulse is a simple, accessible starting point for exploring how Earth's climate is changing. The homepage is available in English and Hindi. The project is organized as a Next.js frontend and a Python/FastAPI backend.

## Requirements

- Node.js 20 or newer and npm
- Python 3.10 or newer

## Run the frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run the backend

In a second terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The health endpoint is at [http://localhost:8000/health](http://localhost:8000/health). The backend allows requests from `http://localhost:3000`.

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

### Estimate a future probability

The `/future` page sends a request to `POST http://localhost:8000/api/probability` and omits the historical years so NASA's latest complete years are discovered dynamically. For a manually bounded request:

```powershell
Invoke-RestMethod `
  -Uri http://localhost:8000/api/probability `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"lat":38.9,"lon":-77.04,"variable":"temperature","condition":"above","threshold":40,"time_window":"next_summer","start_year":2005,"end_year":2025}'
```

Use `time_window: "year"` with a future `target_year` for a calendar-year estimate. Results include the estimated probability and range, the historical count, source data, cache status, assumptions, and limitations. This is a statistical estimate based on historical data, not an official climate forecast.

### Search for a place

`GET http://localhost:8000/api/geocode?q=Washington%20DC` searches place names using OpenStreetMap Nominatim. The interactive maps use OpenStreetMap tiles and include attribution.

### Research assistant

The Research Lab uses `POST /api/research-assistant` to recommend only pre-approved variables, NASA datasets, and research directions. Without an LLM key, it uses a small guided keyword matcher. To enable an optional OpenAI-compatible model, copy `.env.example` to `.env` and set `EARTH_PULSE_LLM_API_KEY` (and, if needed, the API URL and model). The key stays on the backend. The model can select from fixed IDs only; it cannot return climate values or trend claims. It does not receive results from `/api/analyze`.

### Research reports and downloads

After an analysis on `/investigate` or the Multi-variable tool, open `/report` to review the saved results. The snapshot is stored in this browser's local storage; it is not uploaded to the backend. Download the report as a PDF or export the annual data, trend, uncertainty band, source, and version as CSV.

### Demo walkthrough

1. Pick your location on `/investigate` (or search for a place).
2. View the 20-year temperature trend and its data limitations.
3. Compare with another region using the second-place map selection.
4. Ask a future yes/no question on `/future`.
5. Open `/report` and download the report or CSV.

## Project layout

```text
frontend/  Next.js App Router application, reusable UI components, and design system
backend/   FastAPI application with routers, models, and services
.env.example  Example local environment settings (contains no credentials)
```

The `/investigate` page analyzes temperature or rainfall at a chosen location and can compare two locations. The `/future` page estimates the chance of a selected threshold being crossed in a future period. The `/lab` page provides research suggestions and a multi-variable analysis; currently only temperature and rainfall are connected, and soil moisture is shown as unavailable. `/methodology` explains the data and methods in simple language. Analysis pages use NASA POWER historical data; missing values are reported rather than generated or substituted. Trend testing uses complete annual values to avoid mistaking seasonal cycles for long-term trends. These results describe patterns in the data and do not identify their causes.

Run backend tests from the `backend` folder with:

```powershell
pytest
```

The real-data audit and documented resolutions are in [docs/REAL_DATA_AUDIT.md](docs/REAL_DATA_AUDIT.md).

## Environment settings

The frontend defaults to `http://localhost:8000`; set `NEXT_PUBLIC_API_URL` in the frontend environment only if the backend uses another address. For the optional research-assistant model, copy `.env.example` to the repository-root `.env` and set the private `EARTH_PULSE_LLM_API_KEY`. Never commit real API keys. The core analysis and guided research suggestions work without an external model.

## Known limitations

- The connected environmental variables are monthly temperature and precipitation; soil moisture is not available in the current provider.
- NASA POWER's current point records are model-derived MERRA-2 reanalysis, not direct measurements at a household or exact map point.
- Monthly values cannot resolve daily extremes. Future probabilities are statistical estimates, not official forecasts.
- The report snapshot is local to one browser. The generated PDF uses jsPDF's built-in Latin font; Hindi text in a custom report question may not render correctly in the PDF, while the on-page report and UTF-8 CSV retain the text.
- The optional model provides fixed-category research recommendations only. It does not calculate, explain, or receive climate trends.
