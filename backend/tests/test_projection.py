import pytest

from app.models.catalog import (
    ProjectionModelCatalog,
    ProjectionModelResult,
    ProjectionRequest,
    ProjectionYearValue,
)
from app.services.projection import NasaProjectionProvider, _annual_projection_values


def _model_result(name, value):
    years = [
        ProjectionYearValue(year=year, value=value if year == 2050 else 20.0)
        for year in range(2015, 2101)
    ]
    return ProjectionModelResult(
        model=name,
        value=value,
        units="C",
        meets_condition=value > 25,
        annual_values=years,
        source_url=f"https://example.test/{name}",
        retrieved_at_utc="2026-11-15T00:00:00+00:00",
        cache_status="live",
        grid_cell_latitude=39.75,
        grid_cell_longitude=-105.0,
        dataset_name="Synthetic projection fixture",
        dataset_version="test",
    )


def test_annual_projection_uses_month_day_weighted_means_and_keeps_gaps():
    monthly = {2015: {month: 1.0 for month in range(1, 13)}}
    monthly[2016] = {month: 2.0 for month in range(1, 12)}

    annual = _annual_projection_values(monthly)

    assert annual[0].year == 2015
    assert annual[0].value == 1.0
    assert annual[1].year == 2016
    assert annual[1].value is None


def test_projection_reports_model_agreement_not_probability(monkeypatch):
    provider = NasaProjectionProvider()
    catalog = ProjectionModelCatalog(
        temporal="monthly",
        models=["model_a", "model_b", "ensemble"],
        catalog_url="https://power.larc.nasa.gov/api/projection/models?temporal=monthly",
        retrieved_at_utc="2026-11-15T00:00:00+00:00",
    )
    monkeypatch.setattr(provider, "discover_models", lambda: catalog)
    monkeypatch.setattr(
        provider,
        "_fetch_model",
        lambda _request, model: _model_result(model, {"model_a": 30, "model_b": 20, "ensemble": 26}[model]),
    )
    request = ProjectionRequest(
        lat=39.74,
        lon=-104.99,
        variable="temperature",
        condition="above",
        threshold=25,
        scenario="ssp245",
        target_year=2050,
    )

    result = provider.analyze(request)

    assert result.models_with_target_data == 2
    assert result.models_meeting_condition == 1
    assert result.ensemble is None
    assert "1 of 2" in result.interpretation
    assert "not a probability" in result.interpretation
    assert not hasattr(result, "probability_percent")


def test_projection_request_enforces_documented_spatial_and_temporal_bounds():
    with pytest.raises(ValueError):
        ProjectionRequest(
            lat=-60,
            lon=0,
            variable="temperature",
            condition="above",
            threshold=30,
            scenario="ssp245",
            target_year=2050,
        )
    with pytest.raises(ValueError):
        ProjectionRequest(
            lat=20,
            lon=0,
            variable="temperature",
            condition="above",
            threshold=30,
            scenario="ssp999",
            target_year=2050,
        )
