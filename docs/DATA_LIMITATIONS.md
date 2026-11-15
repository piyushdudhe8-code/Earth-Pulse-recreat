# Data limitations

## Historical NASA POWER records

- The connected temperature and corrected-precipitation series use NASA POWER monthly meteorology derived from MERRA-2 reanalysis. They are model-derived, not direct satellite measurements at the visitor's location.
- A point lookup selects the nearest NASA grid cell. It must not be interpreted as a city or country mean or an exact-site observation.
- NASA may revise the archive. A cached response is explicitly labelled cached and includes its original retrieval timestamp.
- NASA fill values and invalid values are missing. Incomplete years are excluded from annual trend calculations; if coverage is insufficient, the API returns an availability error.
- Annual values are useful for long-term trends but hide seasonal changes and short-lived extremes.
- Mann–Kendall, Sen's slope, and linear regression summarize the returned annual series. Serial dependence and other sources of uncertainty are not comprehensively handled. A detected trend does not establish a cause.

## Climate projections

- NASA documents monthly and daily projection coverage from 2015 through 2100 on a 0.25° grid. NASA chooses the nearest grid cell without interpolation; NASA also cautions that some model/scenario/variable/location combinations have missing data.
- The Projection API provides scenario-dependent model output, not an official forecast. SSP scenario values are not probabilities of future pathways.
- The application counts only discovered individual models with a complete target-year record in the selected scenario and reports N of M agreement. Model agreement is not a guaranteed probability.
- A multi-model ensemble is a model product, not an individual observed future outcome. No uncertainty interval is displayed unless a source explicitly provides one; the current point response does not provide one.
- A year with any missing month has no annual value in the app. No gap filling is used.

## CMR catalogue records

- NASA CMR is used as a metadata catalogue. Search results describe collections; Earth Pulse does not download or analyze data from those records.
- Metadata can be incomplete, stale, or link to resources requiring NASA Earthdata Login, account approval, or other permissions. A search result is not a promise of access.
- CMR metadata search and NASA POWER analysis are separate operations. CMR collection coverage does not change any values shown by POWER or the Projection API.

## App scope

- The historical analysis and projection feature currently cover temperature and precipitation only.
- Projection annual values use day-weighted annual means of NASA's monthly output; the current question does not estimate daily extremes, storms, or threshold probabilities.
- Earth Pulse is an independent NASA Space Apps Challenge project, not an official NASA product.
