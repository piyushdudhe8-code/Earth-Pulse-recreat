# Scientific methodology

## Historical trend analysis

1. Earth Pulse requests monthly NASA POWER point data for the selected coordinates and parameter.
2. The response is checked for its parameter, reported units, version, source, requested period, and returned point geometry.
3. NASA fill values (`-999`) and non-finite values are treated as missing. A month is never replaced with an invented value.
4. Annual averages are calculated only for complete calendar years. Monthly means are weighted by the number of days in each month, so leap years are handled by their actual calendar.
5. Mann–Kendall, Sen's slope, and linear regression are run on the annual values, rather than on a seasonally repeating monthly series. The response includes the missing-data counts, direction, rate, p-value, confidence interval, and test metadata.
6. Results describe a pattern in the record. They do not identify a cause.

The current historical meteorological parameters are `T2M` and `PRECTOTCORR`. Their units are taken from the NASA response and remain unchanged.

## Future projection question

The `/future` question uses NASA POWER's Projection API, not an extrapolation from historical observations and not the historical probability method. Before data requests, Earth Pulse fetches NASA's monthly model catalog and only requests the identifiers returned by it. It then requests both supported MVP parameters, `T2M` and `PRECTOTCORR`, over the API's documented monthly period and all scenarios returned when the scenario filter is omitted. The interface lets the visitor select one of NASA's documented scenarios and a target year.

Annual values require all 12 non-fill monthly values and are day-weighted averages in NASA's units. A condition is checked directly against those returned model-year values. If individual models have values, the UI reports how many of the models with valid values meet the condition, such as N of M. This count is **model agreement, not a probability**. If no individual model provides a target-year value but the ensemble does, the ensemble value and threshold comparison are reported instead. An ensemble result is also not a probability.

The chart contains projection records only. It is labelled **“Climate projection (scenario-based), not a forecast”** and is not visually joined to the historical record. The API response reviewed for this integration does not provide a point-query uncertainty interval; the app does not manufacture one.

## CMR dataset discovery

CMR collection searches retrieve descriptive metadata only. CMR results are not passed into the historical or projection calculations, and Earth Pulse does not treat catalogue coverage as evidence that the underlying data is downloadable or available to the visitor. Linked assets may require NASA Earthdata Login and appropriate permissions.

## Interpretation cautions

- Statistical significance is not a measure of practical importance or proof of a cause.
- Annual aggregation hides within-year seasonal and extreme-event patterns.
- Missing years reduce the amount of information available.
- The Mann–Kendall implementation does not correct for every possible serial-correlation or dataset uncertainty issue; those limitations are shown with historical results.
- Climate models represent scenarios and modelled outcomes, not exact predictions of a future year.
- A nearest grid cell is not a local thermometer, rain gauge, or city-wide average.
