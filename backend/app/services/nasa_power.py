import hashlib
import json
import math
import socket
import time
from dataclasses import replace
from datetime import date, datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.services.cache import SQLiteResponseCache
from app.services.data_provider import MonthlyDataset


class DataProviderError(Exception):
    pass


class NasaPowerProvider:
    API_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
    PARAMETERS = {
        "temperature": "T2M",
        "rainfall": "PRECTOTCORR",
    }
    FIRST_DATA_YEAR = 1981

    def __init__(
        self,
        cache: SQLiteResponseCache | None = None,
        timeout_seconds: float = 20,
        retries: int = 3,
    ) -> None:
        self.cache = cache or SQLiteResponseCache()
        self.timeout_seconds = timeout_seconds
        self.retries = retries

    def fetch_monthly(
        self,
        latitude: float,
        longitude: float,
        variable: str,
        start_year: int | None,
        end_year: int | None,
        complete_years: int = 20,
    ) -> MonthlyDataset:
        if variable not in self.PARAMETERS:
            raise ValueError(f"Unsupported NASA POWER variable: {variable}")
        if not math.isfinite(latitude) or not -90 <= latitude <= 90:
            raise ValueError("latitude must be between -90 and 90")
        if not math.isfinite(longitude) or not -180 <= longitude <= 180:
            raise ValueError("longitude must be between -180 and 180")
        if (start_year is None) != (end_year is None):
            raise ValueError("start_year and end_year must both be provided or omitted")

        parameter = self.PARAMETERS[variable]
        if start_year is None:
            if complete_years < 1:
                raise ValueError("complete_years must be a positive integer")
            return self._fetch_latest_complete_years(
                latitude, longitude, parameter, complete_years
            )
        if start_year < self.FIRST_DATA_YEAR or end_year is None or end_year < start_year:
            raise ValueError("The NASA POWER year range is invalid")
        dataset = self._fetch_range(
            latitude, longitude, parameter, start_year, end_year
        )
        return dataset

    def _fetch_latest_complete_years(
        self,
        latitude: float,
        longitude: float,
        parameter: str,
        count: int,
    ) -> MonthlyDataset:
        current_year = date.today().year
        probe_start = max(self.FIRST_DATA_YEAR, current_year - 2)
        probe = self._fetch_range(
            latitude, longitude, parameter, probe_start, current_year
        )
        complete = self._complete_years(probe.observations)
        if not complete:
            probe = self._fetch_range(
                latitude,
                longitude,
                parameter,
                self.FIRST_DATA_YEAR,
                current_year,
            )
            complete = self._complete_years(probe.observations)
        if not complete:
            return replace(probe, selected_years=())

        latest_complete_year = complete[-1]
        window_start = max(self.FIRST_DATA_YEAR, latest_complete_year - count + 1)
        dataset = self._fetch_range(
            latitude, longitude, parameter, window_start, latest_complete_year
        )
        complete = self._complete_years(dataset.observations)
        if len(complete) < count and window_start > self.FIRST_DATA_YEAR:
            dataset = self._fetch_range(
                latitude,
                longitude,
                parameter,
                self.FIRST_DATA_YEAR,
                latest_complete_year,
            )
            complete = self._complete_years(dataset.observations)

        selected_years = tuple(complete[-count:])
        if selected_years:
            selected_observations = {
                period: value
                for period, value in dataset.observations.items()
                if int(period[:4]) in selected_years
            }
        else:
            selected_observations = {}
        return replace(
            dataset,
            observations=selected_observations,
            selected_years=selected_years,
        )

    def _fetch_range(
        self,
        latitude: float,
        longitude: float,
        parameter: str,
        start_year: int,
        end_year: int,
    ) -> MonthlyDataset:
        query = urlencode(
            {
                "parameters": parameter,
                "community": "RE",
                "longitude": f"{longitude:.6f}",
                "latitude": f"{latitude:.6f}",
                "start": str(start_year),
                "end": str(end_year),
                "format": "JSON",
            }
        )
        url = f"{self.API_URL}?{query}"
        cache_key = hashlib.sha256(url.encode("utf-8")).hexdigest()
        cached = self.cache.get_entry(cache_key)
        if cached and cached.source_url == url and cached.retrieved_at_utc:
            payload = cached.payload
            retrieved_at_utc = cached.retrieved_at_utc
            cache_status = "cached"
        else:
            payload = self._request_json(url)
            retrieved_at_utc = datetime.now(timezone.utc).isoformat()
            cache_status = "live"
            self.cache.set(cache_key, payload, url, retrieved_at_utc)

        return self._parse_response(
            payload,
            parameter,
            url,
            retrieved_at_utc,
            cache_status,
            start_year,
            end_year,
        )

    @staticmethod
    def _complete_years(observations: dict[str, float | None]) -> list[int]:
        years = sorted({int(period[:4]) for period in observations})
        return [
            year
            for year in years
            if all(
                observations.get(f"{year}{month:02d}") is not None
                for month in range(1, 13)
            )
        ]

    def _request_json(self, url: str) -> dict[str, Any]:
        request = Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "Earth-Pulse/0.1 (NASA POWER data client)",
            },
        )
        for attempt in range(self.retries):
            try:
                with urlopen(request, timeout=self.timeout_seconds) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if not isinstance(payload, dict):
                    raise DataProviderError("NASA POWER returned a response that was not a JSON object")
                return payload
            except HTTPError as error:
                retryable = error.code == 429 or 500 <= error.code < 600
                if retryable and attempt + 1 < self.retries:
                    time.sleep(0.5 * (2**attempt))
                    continue
                raise DataProviderError(
                    f"NASA POWER returned HTTP {error.code} for this request"
                ) from error
            except (TimeoutError, socket.timeout, URLError) as error:
                if attempt + 1 < self.retries:
                    time.sleep(0.5 * (2**attempt))
                    continue
                raise DataProviderError(
                    f"Could not reach NASA POWER after {self.retries} attempts: {error}"
                ) from error
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise DataProviderError("NASA POWER returned invalid JSON") from error
        raise DataProviderError("NASA POWER request failed without a response")

    @staticmethod
    def _parse_response(
        payload: dict[str, Any],
        parameter: str,
        source_url: str,
        retrieved_at_utc: str,
        cache_status: str,
        start_year: int,
        end_year: int,
    ) -> MonthlyDataset:
        try:
            properties = payload["properties"]
            values = properties["parameter"][parameter]
            header = payload["header"]
            api = header["api"]
            version = api["version"]
            sources = header["sources"]
            parameter_metadata = payload["parameters"][parameter]
            source_units = parameter_metadata["units"]
            geometry = payload["geometry"]
            coordinates = geometry["coordinates"]
        except (KeyError, TypeError) as error:
            raise DataProviderError(
                f"NASA POWER response is missing expected metadata for {parameter}"
            ) from error

        if (
            not isinstance(values, dict)
            or not isinstance(version, str)
            or not version
            or not isinstance(source_units, str)
            or not source_units.strip()
            or not isinstance(coordinates, list)
            or len(coordinates) < 2
        ):
            raise DataProviderError("NASA POWER response has an invalid data or version field")
        try:
            grid_cell_longitude = float(coordinates[0])
            grid_cell_latitude = float(coordinates[1])
        except (TypeError, ValueError) as error:
            raise DataProviderError("NASA POWER response has invalid point coordinates") from error
        if (
            not math.isfinite(grid_cell_latitude)
            or not -90 <= grid_cell_latitude <= 90
            or not math.isfinite(grid_cell_longitude)
            or not -180 <= grid_cell_longitude <= 180
        ):
            raise DataProviderError("NASA POWER response has invalid point coordinates")

        source_names = sources if isinstance(sources, list) else [sources]
        if "MERRA2" not in source_names:
            raise DataProviderError(
                "NASA POWER response does not identify the expected MERRA-2 source"
            )
        fill_value = header.get("fill_value", -999)
        try:
            fill_value_number = float(fill_value)
        except (TypeError, ValueError) as error:
            raise DataProviderError("NASA POWER response has an invalid fill value") from error

        observations: dict[str, float | None] = {}
        for period, raw_value in values.items():
            if (
                not isinstance(period, str)
                or len(period) != 6
                or not period.isdigit()
                or not 1 <= int(period[4:]) <= 12
            ):
                continue
            year = int(period[:4])
            if not start_year <= year <= end_year:
                continue
            try:
                value = float(raw_value)
            except (TypeError, ValueError):
                observations[period] = None
                continue
            observations[period] = (
                None if not math.isfinite(value) or value == fill_value_number else value
            )

        api_name = str(api.get("name", "POWER Monthly and Annual API"))
        dataset_name = api_name if api_name.startswith("NASA ") else f"NASA {api_name}"

        return MonthlyDataset(
            observations=observations,
            dataset_name=dataset_name,
            version=version,
            source="NASA POWER (MERRA-2)",
            source_units=source_units,
            parameter_name=parameter,
            source_url=source_url,
            retrieved_at_utc=retrieved_at_utc,
            cache_status=cache_status,
            grid_cell_latitude=grid_cell_latitude,
            grid_cell_longitude=grid_cell_longitude,
        )
