# NASA data provenance

Earth Pulse keeps data access and metadata discovery separate. Every displayed numeric climate value comes from the response of the named NASA source; missing source values are omitted rather than replaced.

## Historical analysis

- **Endpoint:** [NASA POWER Monthly Point API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
- **Parameters:** `T2M` and `PRECTOTCORR`.
- **Source:** NASA POWER monthly meteorology is identified in the response as MERRA-2. These values are **reanalysis / model-derived**, not direct satellite measurements at the selected point.
- **Location:** NASA selects the nearest available grid cell for a point query. The result is not a city or country average and may not represent the exact coordinate.
- **Units:** Earth Pulse preserves the parameter units supplied by NASA (`C` for `T2M`; `mm/day` for `PRECTOTCORR`). It does not infer a precipitation-unit conversion.
- **Time:** The backend finds complete years from NASA's response and returns the latest complete record it can support. The cache stores the NASA URL and original retrieval time. Cached results are identified as cached and are not described as live.

## Climate projections

- **Endpoint:** [NASA POWER Projection API](https://power.larc.nasa.gov/docs/services/api/projection/), using its monthly point and model-catalog services.
- **Source:** NASA Earth Exchange Global Daily Downscaled Projections (NEX-GDDP-CMIP6), returned directly from NASA's POWER projection service.
- **Models and scenarios:** The backend discovers monthly model availability from NASA before requesting model values. The supported scenario choices follow NASA's documented `ssp126`, `ssp245`, and `ssp370` values.
- **Location and grid:** NASA documents a 0.25° grid and nearest-cell selection without interpolation. The selected cell may differ from the requested point.
- **Time and units:** The documented source coverage is January 2015–December 2100 at monthly frequency. Earth Pulse calculates annual values only from all 12 available monthly source values, weighted by calendar days; units come from the NASA response.
- **Interpretation:** Individual-model counts are reported as model agreement (N of M), never as probability. If only a usable ensemble result exists, it is shown as an ensemble projection. No uncertainty range is invented when the API does not provide one.

## CMR metadata catalogue

- **Endpoint:** [NASA CMR collection search](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html), specifically `/search/collections.json`.
- **Purpose:** CMR records describe datasets: title, short name, version, provider, abstract, spatial and temporal coverage, concept ID, and links.
- **Important boundary:** CMR is used only as a **metadata catalogue** in Earth Pulse. A result does not mean Earth Pulse downloaded, opened, or analyzed that dataset. A public metadata record does not verify that a person can access the linked data; the data link may require NASA Earthdata Login or additional permissions.
- **Search filters:** CMR's collection search supports free-text `keyword`, nested `science_keywords[0][term]`, `entry_title`, `temporal`, and `bounding_box[]`. The UI maps variable/topic/name/time/geographic inputs to these documented query fields.

## Provenance visible with results

Historical and projection result panels show the returned source, parameter and unit, requested point, NASA-returned point, date coverage, retrieval time, cache state, model/scenario where relevant, and source links. The Research Assistant displays records returned from the live CMR collection search and carries the metadata-only and access caveats with them.
