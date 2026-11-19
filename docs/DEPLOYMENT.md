# Public Deployment Guide

Earth Pulse can be deployed as a public, account-free web app. The frontend is a
Next.js app deployed to Vercel; the Python API is a FastAPI web service deployed
to Render. The NASA APIs used by the app do not require Earth Pulse visitors to
sign in. The optional Research Assistant LLM key is not required; without it,
the app uses its guided mode.

Deployment requires the project owner to sign in to Vercel and Render and
authorize access to the GitHub repository. No deployment has been performed by
this guide.

## 1. Prepare the repository

1. Push the current code to the GitHub repository.
2. Confirm `render.yaml` and `frontend/vercel.json` are in the branch you plan to
   deploy.
3. Keep all real `.env` files, API keys, and local cache files out of Git. The
   repository `.gitignore` excludes these files; the Vercel deployment ignore
   file also excludes frontend `.env*` files.

## 2. Create the Vercel frontend

1. Sign in at [Vercel](https://vercel.com/).
2. Choose **Add New… → Project**, connect the GitHub repository, and select it.
3. Set **Root Directory** to `frontend`. Confirm the Next.js framework and the
   build/install commands from `frontend/vercel.json`:
   - Install: `npm ci`
   - Build: `npm run build`
4. Deploy once to obtain the real production frontend origin. The first
   deployment can render static pages, but API-backed actions will show a clear
   configuration error until `NEXT_PUBLIC_API_URL` is set in step 4.
5. Copy the actual Vercel origin shown in the project dashboard. Do not include
   a page path or trailing slash.

## 3. Create the Render API

1. Sign in at [Render](https://render.com/).
2. Choose **New → Blueprint**, connect the same GitHub repository, and select
   the branch containing `render.yaml`.
3. Review the `earth-pulse-api` web service. The Blueprint sets:
   - Root directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/health`
   - Python: `3.12.8`
4. When asked for `EARTH_PULSE_CORS_ORIGINS`, enter the exact Vercel production
   origin copied in step 2, for example the origin displayed in your own Vercel
   dashboard. Use an explicit `https://` origin without a trailing slash. Add
   additional comma-separated origins only for domains you control, such as a
   custom production domain. Do not use `*`.
5. Create the service and wait until Render reports it is healthy. Copy the
   actual service origin from the Render dashboard.
6. Open `<your actual Render origin>/health`. A healthy service returns JSON
   with `status` set to `ok`. The API's interactive documentation is at
   `<your actual Render origin>/docs`.

The cache path is `/tmp/earth-pulse-cache.sqlite3`. This is intentionally
writable on the service, but Render's filesystem is ephemeral here: cache
entries can be lost when the service restarts or redeploys. The app fetches
fresh upstream data again when needed.

## 4. Connect and redeploy the frontend

1. In Vercel, open **Project → Settings → Environment Variables**.
2. Add `NEXT_PUBLIC_API_URL` with the actual Render service origin from step 3.
   Do not add a trailing slash. This value is public and is compiled into the
   frontend; it must never contain a secret.
3. Apply the variable to **Production**. If preview deployments should call the
   same API, add their exact preview origins to Render's
   `EARTH_PULSE_CORS_ORIGINS` setting as well.
4. Redeploy the production frontend so Next.js builds with the configured API
   origin.
5. In Render, check that `EARTH_PULSE_CORS_ORIGINS` exactly matches the
   production Vercel origin, including scheme and hostname. If it changed,
   save the variable and redeploy/restart the API.

## 5. Optional Research Assistant model

The Research Assistant works without an LLM key and still searches NASA CMR for
real dataset metadata. To enable the optional model, set these values in
**Render → your API service → Environment**:

- `EARTH_PULSE_LLM_API_KEY`: secret value from your model provider
- `EARTH_PULSE_LLM_API_URL`: optional; defaults to the OpenAI-compatible URL in
  `.env.example`
- `EARTH_PULSE_LLM_MODEL`: optional; defaults to the model listed in
  `.env.example`

Never set the LLM key in Vercel or prefix it with `NEXT_PUBLIC_`. The provider
may require its own account or charge. The key is not needed to use the site's
NASA analysis features.

## Environment variable reference

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Vercel frontend build | Yes for API features | Public origin of the Render API; not a secret |
| `EARTH_PULSE_CORS_ORIGINS` | Render API | Yes for browser requests | Comma-separated, exact frontend origins; HTTPS outside localhost |
| `EARTH_PULSE_CACHE_PATH` | Render API | Set by `render.yaml` | SQLite cache path; Render filesystem is ephemeral |
| `EARTH_PULSE_LLM_API_KEY` | Render API | No | Optional server-side Research Assistant provider key |
| `EARTH_PULSE_LLM_API_URL` | Render API | No | Optional OpenAI-compatible API URL |
| `EARTH_PULSE_LLM_MODEL` | Render API | No | Optional model identifier |

For local development, the API reads the repository-root `.env` file. Copy
`.env.example` to `.env` and adjust it only if needed. The frontend reads
`frontend/.env.local`; set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` for
local development. This setting is required and is embedded when Next.js
starts or builds, so restart the frontend after changing it. Never put private
credentials in `frontend/.env.local`.

## Production checks and known limits

- Visit the Vercel homepage, `/about`, `/investigate`, `/future`, and `/lab`.
- Visit the Render `/health` endpoint and confirm it returns `{"status":"ok"}`.
- From the deployed site, search for a place, run both historical variables,
  inspect their provenance, try the Future page, and submit a Research
  Assistant question. Record only outcomes actually observed in
  [PUBLIC_TEST_RESULTS.md](./PUBLIC_TEST_RESULTS.md).
- If browser calls fail but the API health URL works, check the exact Vercel
  origin in Render's `EARTH_PULSE_CORS_ORIGINS` and redeploy the frontend after
  changing `NEXT_PUBLIC_API_URL`.
- NASA and CMR are upstream services. Their availability and coverage are not
  guaranteed; the app must show an error or missing-data result rather than
  invent a value.
- Render's free service may sleep when idle and has limited resources. The
  deployment has no account system or API rate limiter. Review service usage
  and upstream-provider terms before sharing it widely.
- The frontend and backend do not store visitor accounts or investigation
  reports server-side. Reports are saved in the visitor's browser.

## Manual deployment handoff

Deployment needs your Vercel and Render accounts. Create the two services using
the steps above, then share the actual public frontend and backend origins.
Until those URLs exist, public-site testing cannot be performed.
