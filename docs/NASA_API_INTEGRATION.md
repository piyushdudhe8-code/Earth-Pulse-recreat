# NASA POWER Projection API integration

Documentation reviewed: [NASA POWER Projection API](https://power.larc.nasa.gov/docs/services/api/projection/) on 2026-11-15.

## What the documentation confirms

- **Monthly point data endpoint:** `https://power.larc.nasa.gov/api/projection/monthly/point`
- **Model discovery endpoint:** `https://power.larc.nasa.gov/api/projection/models?temporal=monthly`. The response lists the models published in the monthly data store. The service must be queried before requesting model data; model availability differs by data store.
- **Documented scenario identifiers:** `ssp126`, `ssp245`, and `ssp370`. Omitting the scenario returns all three, while an unsupported scenario returns HTTP 422.
- **Model selection:** the point endpoint's `model` argument accepts the lowercase identifiers returned by the Models service. `ensemble` is the documented default; individual CMIP6 model identifiers may be requested when available in the selected store.
- **Spatial resolution:** 0.25° × 0.25° global grid. The API selects the nearest grid cell, without interpolation; its cell location may differ from the requested coordinates.
- **Coverage:** monthly and daily records run from January 2015 through December 2100, in UTC.
- **Supported variables used here:** `T2M` and `PRECTOTCORR`, available at monthly frequency. The response includes units in its `parameters` metadata and uses `-999` for missing values.
- **Spatial limits:** latitude `-59.875` through `89.875`; longitude `-179.875` through `179.875`. Documentation warns that valid spatial coverage does not guarantee values for each model, scenario, parameter, and date.
- **Response structure:** JSON organizes values as `parameter -> scenario -> date`; metadata includes model, scenarios, temporal frequency, API version, fill value, time standard, and returned point geometry.

## Live monthly catalog check

The documented discovery endpoint was queried before implementing point requests. Its response was:

```json
{
  "temporal": "monthly",
  "models": [
    "cesm2",
    "ec_earth3",
    "ensemble",
    "gfdl_esm4",
    "giss_e2_1_g",
    "ipsl_cm6a_lr",
    "mpi_esm1_2_lr"
  ]
}
```

This is the catalog observed during the check, not a hardcoded model list. Earth Pulse discovers it again before each projection analysis and uses only returned model identifiers. The app offers only the three documented scenario identifiers.

## Earth Pulse behavior and limitations

Earth Pulse requests monthly `T2M` and `PRECTOTCORR` data without a scenario filter for each discovered individual model. NASA's documented response format then returns the supported scenarios. The app computes day-weighted annual means from the selected variable and scenario in those NASA responses. The yes/no result is derived only from returned model values for the requested year. The ensemble is also requested; it is displayed only when no individual model provides a usable target-year value. Where individual model data exist, the interface reports the count meeting the condition out of the models with valid values for that year; that count is model agreement, not a probability.

Earth Pulse also requests the discovered `ensemble` model and shows its value only when no individual model provides a complete target year. It reports the ensemble value and whether it meets the condition, without converting that result to a probability. The Projection API response reviewed here did not provide an uncertainty interval; the UI says so rather than inventing one. If the nearest grid cell has only fill values, the API reports that projection data are unavailable for the selected place, model, variable, scenario, or year.

Projection charts contain projection data only and are explicitly labeled **“Climate projection (scenario-based), not a forecast.”** They are not combined with historical NASA POWER observations. The provenance panel identifies the NASA source, selected scenario and model(s), parameter and original unit, requested point, returned grid-cell coordinates, UTC retrieval time, source URLs, and nearest-grid-cell limitation.

## References

- [Projection API documentation](https://power.larc.nasa.gov/docs/services/api/projection/)
- [Monthly Point service](https://power.larc.nasa.gov/api/projection/monthly/point)
- [Models service](https://power.larc.nasa.gov/api/projection/models?temporal=monthly)
