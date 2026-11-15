#!/usr/bin/env python3
"""LIVE NASA verification script; not a pytest test and makes real external requests."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


NASA_POWER = "https://power.larc.nasa.gov/api/temporal/monthly/point"
NASA_PROJECTION_ROOT = "https://power.larc.nasa.gov/api/projection"
NASA_CMR_COLLECTIONS = "https://cmr.earthdata.nasa.gov/search/collections.json"
TIMEOUT_SECONDS = 40


def get_json(url: str) -> tuple[dict, dict[str, str], str]:
    request = Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "Earth-Pulse-live-verification/1.0"},
    )
    with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        body = json.loads(response.read().decode("utf-8"))
        headers = {key.lower(): value for key, value in response.headers.items()}
    if not isinstance(body, dict):
        raise ValueError(f"Expected a JSON object from {url}")
    return body, headers, datetime.now(timezone.utc).isoformat()


def report_power(variable: str, parameter: str, latitude: float, longitude: float) -> None:
    query = urlencode(
        {
            "parameters": parameter,
            "community": "RE",
            "longitude": f"{longitude:.6f}",
            "latitude": f"{latitude:.6f}",
            "start": "2006",
            "end": "2025",
            "format": "JSON",
        }
    )
    url = f"{NASA_POWER}?{query}"
    payload, _, retrieved_at = get_json(url)
    values = payload["properties"]["parameter"][parameter]
    valid_months = [
        key for key, value in values.items()
        if isinstance(key, str)
        and len(key) == 6
        and key.isdigit()
        and 1 <= int(key[4:]) <= 12
        and isinstance(value, (int, float))
        and value != -999
    ]
    non_calendar_periods = [
        key for key in values
        if not isinstance(key, str) or len(key) != 6 or not key.isdigit() or not 1 <= int(key[4:]) <= 12
    ]
    metadata = payload["parameters"][parameter]
    print(f"\nNASA POWER {variable}")
    print(f"  endpoint: {url}")
    print(f"  retrieved_at_utc: {retrieved_at}")
    print(f"  parameter/unit: {parameter} / {metadata['units']}")
    print(f"  response month coverage: {min(valid_months) if valid_months else 'none'} through {max(valid_months) if valid_months else 'none'}")
    print(f"  valid_months: {len(valid_months)} / {len(values)}")
    if non_calendar_periods:
        print(f"  non-calendar monthly keys ignored: {', '.join(non_calendar_periods[:3])}")
    print(f"  NASA source/version: {payload['header'].get('sources')} / {payload['header']['api'].get('version')}")


def report_projection(latitude: float, longitude: float) -> None:
    catalog_url = f"{NASA_PROJECTION_ROOT}/models?temporal=monthly"
    catalog, _, catalog_retrieved = get_json(catalog_url)
    models = catalog["models"]
    model = "ensemble" if "ensemble" in models else models[0]
    query = urlencode(
        {
            "parameters": "T2M,PRECTOTCORR",
            "community": "RE",
            "longitude": f"{longitude:.6f}",
            "latitude": f"{latitude:.6f}",
            "start": "205001",
            "end": "205012",
            "format": "JSON",
            "time-standard": "UTC",
            "model": model,
        }
    )
    url = f"{NASA_PROJECTION_ROOT}/monthly/point?{query}"
    payload, _, retrieved_at = get_json(url)
    header = payload["header"]
    parameters = payload["properties"]["parameter"]
    print("\nNASA POWER Projection model discovery")
    print(f"  endpoint: {catalog_url}")
    print(f"  retrieved_at_utc: {catalog_retrieved}")
    print(f"  models_found: {', '.join(models)}")
    print("\nNASA POWER Projection data")
    print(f"  endpoint: {url}")
    print(f"  retrieved_at_utc: {retrieved_at}")
    print(f"  model: {header.get('model')}")
    print(f"  scenarios_returned: {', '.join(header.get('scenarios', []))}")
    print(f"  years_requested/returned: 2050 / {header.get('start')} to {header.get('end')}")
    for parameter, scenario_data in parameters.items():
        units = payload["parameters"][parameter]["units"]
        counts = {
            scenario: sum(value != -999 for value in values.values())
            for scenario, values in scenario_data.items()
        }
        print(f"  {parameter} unit={units}, valid_months_by_scenario={json.dumps(counts, sort_keys=True)}")


def report_cmr() -> None:
    query = urlencode({"keyword": "GPM_3IMERGDF", "page_size": "5"})
    url = f"{NASA_CMR_COLLECTIONS}?{query}"
    payload, headers, retrieved_at = get_json(url)
    entries = payload.get("feed", {}).get("entry", [])
    if isinstance(entries, dict):
        entries = [entries]
    print("\nNASA CMR metadata search (catalogue only; no data download)")
    print(f"  endpoint: {url}")
    print(f"  retrieved_at_utc: {retrieved_at}")
    print(f"  hits: {headers.get('cmr-hits', 'not supplied')}")
    print(f"  records_returned: {len(entries)}")
    for entry in entries:
        print(
            "  record: "
            + json.dumps(
                {
                    "title": entry.get("title"),
                    "short_name": entry.get("short_name"),
                    "version": entry.get("version_id"),
                    "provider": entry.get("data_center"),
                    "concept_id": entry.get("id"),
                    "temporal_start": entry.get("time_start"),
                    "temporal_end": entry.get("time_end"),
                    "spatial_coverage": entry.get("boxes", []),
                },
                ensure_ascii=False,
                sort_keys=True,
            )
        )
    print("  notice: CMR metadata does not mean Earth Pulse downloaded or analyzed the described data.")


def main() -> int:
    print("LIVE NASA VERIFICATION - makes real network requests; results depend on current NASA services.")
    print("Historical POWER point: Thane, India (19.2, 72.97).")
    report_power("temperature", "T2M", 19.2, 72.97)
    report_power("precipitation", "PRECTOTCORR", 19.2, 72.97)
    print("\nProjection point: Denver, USA (39.74, -104.99), selected because a previous live request returned valid projection values there.")
    report_projection(39.74, -104.99)
    report_cmr()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (HTTPError, URLError, TimeoutError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"LIVE VERIFICATION FAILED: {error}", file=sys.stderr)
        raise SystemExit(1) from error
