# Earth Pulse real-data audit

**Scope:** Production paths under `frontend/src` and `backend/app`  
**Audit date:** 2026-11-15  
**NASA documentation reviewed:** [NASA POWER Monthly and Annual API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)

## Findings

| Area | Finding | Resolution |
| --- | --- | --- |
| Environmental fixtures | No production mock climate arrays, random climate values, or hardcoded trend results were found. The numeric arrays in the PDF exporter are RGB chart colors; the chart itself is drawn from saved annual API results. | No mock data was removed. |
| Probability resampling | `backend/app/services/probability.py` uses a seeded random generator for residual bootstrap samples. It resamples values and residuals from the fetched NASA time series; it does not generate or substitute environmental observations. | Kept as a statistical uncertainty method; source and limitations remain visible. |
| Test fixtures | Synthetic series are used for statistics, provider, analysis, cache, and probability tests. | Kept under `backend/tests/` only and explicitly named synthetic. |
| Year selection | `/investigate`, `/future`, and the Research Lab previously calculated a fixed year range in the browser, which could assume the latest calendar year was complete. | The backend now probes NASA's returned months, identifies the latest complete year, and selects the latest available complete years. The UI displays the returned range. |
| Precipitation units | The analysis and probability paths previously multiplied `PRECTOTCORR` values by calendar days and presented converted totals. That did not preserve the source parameter's units. | Both paths now retain the unit string returned by NASA and use day-weighted averages for annual/period aggregation; no precipitation unit conversion is performed. |
| NASA response metadata | Units were previously checked against hardcoded strings, and API responses did not include retrieval/cache details or the NASA-returned point geometry. | Units, version, parameter name, source, geometry, and query URL now come from the NASA response. UTC retrieval time and `live`/`cached` state are persisted with cached responses. |
| Visitor provenance | Results previously had no complete provenance panel and could not distinguish a cache hit from a live NASA request. | Investigation results now show source, parameter, units, coverage, selected and returned coordinates, data type, retrieval time, method, limitations, and NASA links. The verification badge appears only for live responses; cached results say `CACHED DATA` and show their original retrieval timestamp. Other analysis/report views label cache state as well. |
| Point interpretation | Earlier copy referred generally to the selected place, without consistently clarifying the spatial meaning of a point query. | Result copy identifies the nearest NASA grid cell and does not describe the point as a city or country average. |
| User controls | Fixed threshold examples and future-year choices are present in the question builder. These are editable scenario inputs, not climate observations or calculated results. | Retained as user controls; rainfall inputs are not converted and results identify the source unit. Map coordinates are selected by the visitor or geolocation, not environmental measurements. |

## NASA source and handling

NASA POWER's official monthly/annual documentation states that meteorological parameters are derived from NASA GMAO MERRA-2 and are available through the previous year. Earth Pulse uses the monthly point endpoint with `T2M` and `PRECTOTCORR`. The response's unit metadata is retained verbatim; `-999` and non-finite values are treated as missing. Invalid month keys, including a non-calendar month, are not used.

The latest complete year is detected from the returned monthly values rather than inferred from the current date. The backend then requests the corresponding 20-year window, expanding its query only if it needs earlier complete years to find 20 valid calendar years. If it cannot find 20 complete years for the default investigation, it returns an availability error instead of estimating from a shorter window.

Trend analysis uses complete annual means, Mann–Kendall, Sen's slope, and linear regression with a 95% confidence interval. Trends describe the record and do not identify a cause. Cache hits preserve the original NASA source URL and retrieval timestamp and are never labeled live.

## Remaining limitations

- NASA POWER's returned point geometry is presented as the nearest NASA grid cell for the point request; it is not a city/country average or an in-situ measurement.
- NASA POWER's meteorological fields are MERRA-2 reanalysis, not direct satellite measurements.
- Incomplete or unavailable data can prevent a 20-year trend result; missing values are reported and not imputed.
- The confidence interval and probability estimates rely on statistical assumptions described in the app; they are not official climate forecasts.
- Geolocation, coordinates, chart styling, and user-entered thresholds are not NASA climate observations.
