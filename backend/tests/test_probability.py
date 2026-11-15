from app.models.analysis import ProbabilityRequest
from app.services.data_provider import MonthlyDataset
from app.services.probability import estimate_probability
from app.services.probability import _aggregate_period, _bootstrap_probability


def test_bootstrap_probability_is_reproducible_and_never_certain() -> None:
    years = list(range(2000, 2020))
    values = [
        15.0 + 0.1 * (year - 2000) + ((index % 3) - 1) * 0.5
        for index, year in enumerate(years)
    ]

    estimate = _bootstrap_probability(
        years=years,
        values=values,
        target_year=2030,
        threshold=100.0,
        condition="above",
    )
    repeated_estimate = _bootstrap_probability(
        years=years,
        values=values,
        target_year=2030,
        threshold=100.0,
        condition="above",
    )

    assert estimate == repeated_estimate
    assert 0 < estimate[0] < 100
    assert estimate[1] <= estimate[0] <= estimate[2]


def test_precipitation_period_value_stays_in_source_daily_rate_units() -> None:
    observations = {
        "202401": 1.0,
        "202402": 3.0,
        "202403": 5.0,
    }

    value = _aggregate_period(
        observations,
        "rainfall",
        [(2024, "01"), (2024, "02"), (2024, "03")],
    )

    assert value == (1.0 * 31 + 3.0 * 29 + 5.0 * 31) / (31 + 29 + 31)


class SyntheticProbabilityProvider:
    def fetch_monthly(
        self,
        latitude,
        longitude,
        variable,
        start_year,
        end_year,
        complete_years=20,
    ):
        years = tuple(range(2006, 2026))
        observations = {
            f"{year}{month:02d}": 1.0 + (year - years[0]) * 0.1
            for year in years
            for month in range(1, 13)
        }
        return MonthlyDataset(
            observations=observations,
            dataset_name="NASA POWER Monthly and Annual API",
            version="v-test",
            source="NASA POWER (MERRA-2)",
            source_units="mm/day",
            parameter_name="PRECTOTCORR",
            source_url="https://power.larc.nasa.gov/synthetic-test-url",
            retrieved_at_utc="2026-01-01T00:00:00+00:00",
            cache_status="cached",
            grid_cell_latitude=latitude,
            grid_cell_longitude=longitude,
            selected_years=years,
        )


def test_dynamic_probability_carries_real_data_provenance_fields() -> None:
    request = ProbabilityRequest(
        lat=19.2,
        lon=72.97,
        variable="rainfall",
        condition="above",
        threshold=2.0,
        time_window="year",
        target_year=2030,
    )

    response = estimate_probability(request, SyntheticProbabilityProvider())

    assert response.units == "mm/day"
    assert response.data_used.parameter_name == "PRECTOTCORR"
    assert response.data_used.analysis_units == "mm/day"
    assert response.data_used.cache_status == "cached"
    assert response.data_used.retrieved_at_utc == "2026-01-01T00:00:00+00:00"
    assert response.data_used.requested_start_year == 2006
    assert response.data_used.requested_end_year == 2025
