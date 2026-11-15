import json
from datetime import date
from io import BytesIO
from urllib.parse import parse_qs, urlparse

import pytest

from app.services.cache import SQLiteResponseCache
from app.services.nasa_power import DataProviderError, NasaPowerProvider


def _synthetic_payload(start_year: int, end_year: int) -> dict:
    temperature: dict[str, float] = {}
    precipitation: dict[str, float] = {}
    for year in range(start_year, end_year + 1):
        month_end = 8 if year == 2026 else 12
        for month in range(1, month_end + 1):
            period = f"{year}{month:02d}"
            temperature[period] = 20 + (year - start_year) * 0.1
            precipitation[period] = 2.5 + (year - start_year) * 0.01
    temperature["202513"] = 99
    precipitation["202513"] = 99
    return {
        "header": {
            "api": {"version": "v-test", "name": "POWER Monthly and Annual API"},
            "sources": ["MERRA2"],
            "fill_value": -999,
        },
        "parameters": {
            "T2M": {"units": "C", "longname": "Temperature at 2 Meters"},
            "PRECTOTCORR": {"units": "mm/day", "longname": "Precipitation Corrected"},
        },
        "properties": {
            "parameter": {
                "T2M": temperature,
                "PRECTOTCORR": precipitation,
            }
        },
        "geometry": {"type": "Point", "coordinates": [72.97, 19.2, 97.15]},
    }


def test_parser_keeps_nasa_units_and_marks_fill_values_missing() -> None:
    payload = _synthetic_payload(2025, 2025)
    payload["properties"]["parameter"]["T2M"]["202501"] = -999
    dataset = NasaPowerProvider._parse_response(
        payload,
        "T2M",
        "https://power.larc.nasa.gov/example",
        "2026-01-01T00:00:00+00:00",
        "live",
        2025,
        2025,
    )

    assert dataset.source_units == "C"
    assert dataset.parameter_name == "T2M"
    assert dataset.observations["202501"] is None
    assert "202513" not in dataset.observations
    assert dataset.source == "NASA POWER (MERRA-2)"
    assert dataset.grid_cell_latitude == 19.2
    assert dataset.grid_cell_longitude == 72.97


def test_parser_uses_response_units_instead_of_assuming_them() -> None:
    payload = _synthetic_payload(2025, 2025)
    payload["parameters"]["PRECTOTCORR"]["units"] = "NASA-provided-unit"

    dataset = NasaPowerProvider._parse_response(
        payload,
        "PRECTOTCORR",
        "https://power.larc.nasa.gov/example",
        "2026-01-01T00:00:00+00:00",
        "live",
        2025,
        2025,
    )

    assert dataset.source_units == "NASA-provided-unit"
    assert dataset.observations["202502"] == pytest.approx(2.5)


def test_latest_complete_year_is_discovered_and_cache_is_labeled(
    tmp_path, monkeypatch
) -> None:
    requested_ranges: list[tuple[int, int]] = []

    class FixedDate:
        @classmethod
        def today(cls) -> date:
            return date(2026, 11, 15)

    def fake_urlopen(request, timeout):
        assert timeout == 20
        query = parse_qs(urlparse(request.full_url).query)
        start_year = int(query["start"][0])
        end_year = int(query["end"][0])
        requested_ranges.append((start_year, end_year))
        return BytesIO(json.dumps(_synthetic_payload(start_year, end_year)).encode())

    monkeypatch.setattr("app.services.nasa_power.date", FixedDate)
    monkeypatch.setattr("app.services.nasa_power.urlopen", fake_urlopen)
    provider = NasaPowerProvider(
        cache=SQLiteResponseCache(str(tmp_path / "synthetic-cache.sqlite3"))
    )

    first = provider.fetch_monthly(19.2, 72.97, "temperature", None, None)

    assert requested_ranges == [(2024, 2026), (2006, 2025)]
    assert first.selected_years == tuple(range(2006, 2026))
    assert first.source_url.endswith("start=2006&end=2025&format=JSON")
    assert first.cache_status == "live"
    assert first.retrieved_at_utc.endswith("+00:00")
    assert len(first.observations) == 240

    def unexpected_network_call(*_args, **_kwargs):
        pytest.fail("A valid cached NASA response should avoid another request")

    monkeypatch.setattr("app.services.nasa_power.urlopen", unexpected_network_call)
    cached = provider.fetch_monthly(19.2, 72.97, "temperature", None, None)

    assert cached.cache_status == "cached"
    assert cached.retrieved_at_utc == first.retrieved_at_utc
    assert cached.source_url == first.source_url


def test_parser_rejects_non_merra2_provenance() -> None:
    payload = _synthetic_payload(2025, 2025)
    payload["header"]["sources"] = ["UNEXPECTED"]

    with pytest.raises(DataProviderError, match="does not identify"):
        NasaPowerProvider._parse_response(
            payload,
            "T2M",
            "https://power.larc.nasa.gov/example",
            "2026-01-01T00:00:00+00:00",
            "live",
            2025,
            2025,
        )
