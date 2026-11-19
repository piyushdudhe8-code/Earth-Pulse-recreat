from calendar import monthrange

from app.models.analysis import AnalyzeRequest
from app.services.analysis import analyze_location
from app.services.data_provider import MonthlyDataset
import pytest


class SyntheticProvider:
    def __init__(self, years=tuple(range(2006, 2026)), monthly_pattern=False):
        self.years = years
        self.monthly_pattern = monthly_pattern

    def fetch_monthly(
        self,
        latitude,
        longitude,
        variable,
        start_year,
        end_year,
        complete_years=20,
    ):
        years = self.years
        observations = {
            f"{year}{month:02d}": (
                1.0
                + (year - years[0]) * 0.2
                + (month if self.monthly_pattern else 0)
            )
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
            cache_status="live",
            grid_cell_latitude=latitude,
            grid_cell_longitude=longitude,
            selected_years=years,
        )


def test_dynamic_analysis_preserves_precipitation_source_units() -> None:
    request = AnalyzeRequest(
        lat=19.2,
        lon=72.97,
        variable="rainfall",
        frequency="monthly",
    )

    response = analyze_location(request, SyntheticProvider())

    assert response.annual_time_series.units == "mm/day"
    assert response.annual_time_series.records[0].value == 1.0
    assert response.annual_time_series.records[-1].value == pytest.approx(4.8)
    assert response.trend.rate_units == "mm/day per decade"
    assert response.dataset.parameter_name == "PRECTOTCORR"
    assert response.dataset.data_type == "reanalysis / model-derived"
    assert response.dataset.cache_status == "live"
    assert response.dataset.requested_start_year == 2006
    assert response.dataset.requested_end_year == 2025


def test_dynamic_analysis_returns_available_complete_years_when_fewer_than_twenty() -> None:
    years = tuple(range(2011, 2026))
    request = AnalyzeRequest(
        lat=19.2,
        lon=72.97,
        variable="rainfall",
        frequency="monthly",
    )

    response = analyze_location(request, SyntheticProvider(years))

    assert response.data_availability.complete_years == 15
    assert response.annual_time_series.records[0].period == "2011"
    assert response.annual_time_series.records[-1].period == "2025"


def test_annual_values_use_day_weighted_monthly_means() -> None:
    years = tuple(range(2011, 2021))
    request = AnalyzeRequest(
        lat=19.2,
        lon=72.97,
        variable="rainfall",
        frequency="monthly",
    )

    response = analyze_location(
        request,
        SyntheticProvider(years, monthly_pattern=True),
    )

    leap_year_days = sum(monthrange(2012, month)[1] for month in range(1, 13))
    expected = (
        sum(
            (1.0 + (2012 - years[0]) * 0.2 + month) * monthrange(2012, month)[1]
            for month in range(1, 13)
        )
        / leap_year_days
    )
    actual = response.annual_time_series.records[1].value
    assert actual == pytest.approx(expected)
    assert actual != pytest.approx(1.0 + (2012 - years[0]) * 0.2 + 6.5)
