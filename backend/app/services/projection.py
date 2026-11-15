import hashlib
import json
import math
import socket
import time
from calendar import monthrange
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.models.catalog import (
    ProjectionModelCatalog,
    ProjectionModelResult,
    ProjectionRequest,
    ProjectionResponse,
    ProjectionYearValue,
)
from app.services.cache import SQLiteResponseCache


PROJECTION_ROOT = "https://power.larc.nasa.gov/api/projection"
MONTHLY_MODELS_URL = f"{PROJECTION_ROOT}/models?temporal=monthly"
MONTHLY_POINT_URL = f"{PROJECTION_ROOT}/monthly/point"
SCENARIOS = ("ssp126", "ssp245", "ssp370")
PARAMETERS = {"temperature": "T2M", "rainfall": "PRECTOTCORR"}
FILL_VALUE = -999.0
PROJECTION_LIMITATIONS = [
    "This is a scenario-based climate projection, not a weather prediction or official forecast.",
    "NASA selects the nearest 0.25° grid cell without interpolation; the point can differ from the requested coordinates and is not a city or country average.",
    "NASA may have missing values for a particular model, scenario, variable, place, or year; missing values are excluded, never filled with estimates.",
    "Model agreement is not a probability and does not guarantee what will happen.",
    "The API response does not provide an uncertainty interval for this point query; Earth Pulse does not invent one.",
]


class ProjectionUnavailableError(Exception):
    def __init__(self, message: str, availability: dict[str, object] | None = None) -> None:
        super().__init__(message)
        self.availability = availability or {}


class NasaProjectionProvider:
    def __init__(
        self,
        cache: SQLiteResponseCache | None = None,
        timeout_seconds: float = 30,
        retries: int = 3,
    ) -> None:
        self.cache = cache or SQLiteResponseCache()
        self.timeout_seconds = timeout_seconds
        self.retries = retries

    def discover_models(self) -> ProjectionModelCatalog:
        payload, _, retrieved_at = self._fetch_json(MONTHLY_MODELS_URL, use_cache=False)
        models = payload.get("models")
        if (
            payload.get("temporal") != "monthly"
            or not isinstance(models, list)
            or not models
            or any(not isinstance(model, str) or not model for model in models)
        ):
            raise ProjectionUnavailableError(
                "NASA POWER returned an invalid monthly projection model catalog."
            )
        return ProjectionModelCatalog(
            temporal="monthly",
            models=models,
            catalog_url=MONTHLY_MODELS_URL,
            retrieved_at_utc=retrieved_at,
        )

    def analyze(self, request: ProjectionRequest) -> ProjectionResponse:
        catalog = self.discover_models()
        models = [model for model in catalog.models if model != "ensemble"]
        if not models:
            models = ["ensemble"]

        model_results: list[ProjectionModelResult] = []
        ensemble: ProjectionModelResult | None = None
        failures: list[str] = []
        with ThreadPoolExecutor(max_workers=min(4, len(models) + 1)) as executor:
            futures = {
                executor.submit(self._fetch_model, request, model): model
                for model in models
            }
            if "ensemble" in catalog.models:
                futures[executor.submit(self._fetch_model, request, "ensemble")] = "ensemble"
            for future in as_completed(futures):
                model = futures[future]
                try:
                    result = future.result()
                except ProjectionUnavailableError:
                    failures.append(model)
                    continue
                if model == "ensemble":
                    ensemble = result
                else:
                    model_results.append(result)

        model_results.sort(key=lambda result: result.model)
        model_values = [
            item for item in model_results if item.value is not None
        ]
        if not model_values and (ensemble is None or ensemble.value is None):
            raise ProjectionUnavailableError(
                "NASA returned no usable projection values for this place, variable, "
                "scenario, and year.",
                {
                    "discovered_models": catalog.models,
                    "models_with_target_data": 0,
                    "target_year": request.target_year,
                    "scenario": request.scenario,
                    "failed_models": failures,
                },
            )

        meets = [
            item.meets_condition
            for item in model_values
            if item.meets_condition is not None
        ]
        if model_values:
            meeting_count = sum(meets)
            interpretation = (
                f"{meeting_count} of {len(model_values)} available individual models "
                f"meet this condition for {request.target_year}. This is model agreement, "
                "not a probability or guarantee."
            )
        elif ensemble is not None and ensemble.meets_condition is not None:
            meeting_count = None
            interpretation = (
                f"The NASA multi-model ensemble value "
                f"{ensemble.value:g} {ensemble.units} "
                f"{'is' if ensemble.meets_condition else 'is not'} {request.condition} "
                f"{request.threshold:g} for {request.target_year}. This is a projection value, "
                "not a probability."
            )
        else:
            meeting_count = None
            interpretation = "NASA returned projection data, but not a usable target-year result."

        selected_results = model_results if model_values else []
        all_results = [*selected_results, *([ensemble] if ensemble and not model_values else [])]
        first = next((item for item in all_results if item.value is not None), None)
        if first is None:
            raise ProjectionUnavailableError("NASA returned no usable projection values.")

        metadata = {
            "latitude": first.grid_cell_latitude,
            "longitude": first.grid_cell_longitude,
            "units": first.units,
            "title": first.dataset_name,
            "version": first.dataset_version,
        }
        all_retrieval_times = [catalog.retrieved_at_utc, *(item.retrieved_at_utc for item in all_results)]
        all_source_urls = list(
            dict.fromkeys(
                [catalog.catalog_url, *(item.source_url for item in all_results)]
            )
        )
        statuses = {item.cache_status for item in all_results}
        cache_status = next(iter(statuses)) if len(statuses) == 1 else "mixed"
        limitations = list(PROJECTION_LIMITATIONS)
        if failures:
            limitations.append(
                "NASA requests failed for these discovered models: "
                + ", ".join(sorted(failures))
                + ". The model count includes only models with valid target-year values."
            )

        return ProjectionResponse(
            latitude=request.lat,
            longitude=request.lon,
            grid_cell_latitude=metadata["latitude"],
            grid_cell_longitude=metadata["longitude"],
            variable=request.variable,
            parameter_name=PARAMETERS[request.variable],
            units=metadata["units"],
            scenario=request.scenario,
            target_year=request.target_year,
            condition=request.condition,
            threshold=request.threshold,
            discovered_models=catalog.models,
            models_with_target_data=len(model_values),
            models_meeting_condition=meeting_count,
            ensemble=ensemble if not model_values else None,
            model_results=selected_results,
            interpretation=interpretation,
            dataset_name=metadata["title"],
            dataset_version=metadata["version"],
            source="NASA POWER Projection API (NEX-GDDP-CMIP6)",
            data_type="downscaled climate model projection",
            temporal_coverage="2015-01 through 2100-12 (monthly source data)",
            retrieved_at_utc=max(all_retrieval_times),
            cache_status=cache_status,
            source_urls=all_source_urls,
            limitations=limitations,
        )

    def _fetch_model(
        self,
        request: ProjectionRequest,
        model: str,
    ) -> ProjectionModelResult:
        params = {
            "parameters": "T2M,PRECTOTCORR",
            "community": "RE",
            "longitude": f"{request.lon:.6f}",
            "latitude": f"{request.lat:.6f}",
            "start": "201501",
            "end": "210012",
            "format": "JSON",
            "time-standard": "UTC",
            "model": model,
        }
        source_url = f"{MONTHLY_POINT_URL}?{urlencode(params)}"
        payload, cached, retrieved_at = self._fetch_json(source_url, use_cache=True)
        try:
            header = payload["header"]
            values = payload["properties"]["parameter"][PARAMETERS[request.variable]][request.scenario]
            units = payload["parameters"][PARAMETERS[request.variable]]["units"]
            coordinates = payload["geometry"]["coordinates"]
            source_model = header["model"]
            version = header["api"]["version"]
        except (KeyError, TypeError) as error:
            raise ProjectionUnavailableError(
                f"NASA returned incomplete projection metadata for model {model}."
            ) from error

        source_names = header.get("sources")
        scenarios = header.get("scenarios")
        if (
            source_model != model
            or not isinstance(values, dict)
            or not isinstance(units, str)
            or not units
            or not isinstance(version, str)
            or not version
            or not isinstance(source_names, list)
            or "NEXGDDP" not in source_names
            or not isinstance(scenarios, list)
            or request.scenario not in scenarios
        ):
            raise ProjectionUnavailableError(
                f"NASA returned invalid projection data for model {model}."
            )
        try:
            grid_lon, grid_lat = float(coordinates[0]), float(coordinates[1])
        except (TypeError, ValueError, IndexError) as error:
            raise ProjectionUnavailableError(
                f"NASA returned invalid location metadata for model {model}."
            ) from error
        if not math.isfinite(grid_lat) or not math.isfinite(grid_lon):
            raise ProjectionUnavailableError(
                f"NASA returned invalid location metadata for model {model}."
            )

        monthly: dict[int, dict[int, float]] = {}
        for date_key, raw_value in values.items():
            if (
                not isinstance(date_key, str)
                or len(date_key) != 6
                or not date_key.isdigit()
                or not 1 <= int(date_key[4:]) <= 12
            ):
                continue
            try:
                value = float(raw_value)
            except (TypeError, ValueError):
                continue
            if not math.isfinite(value) or value == FILL_VALUE:
                continue
            year, month = int(date_key[:4]), int(date_key[4:])
            monthly.setdefault(year, {})[month] = value

        annual_values = _annual_projection_values(monthly)
        target_value = next(
            (point.value for point in annual_values if point.year == request.target_year),
            None,
        )
        meets_condition = None
        if target_value is not None:
            meets_condition = (
                target_value > request.threshold
                if request.condition == "above"
                else target_value < request.threshold
            )

        metadata = self._metadata(source_url, payload, retrieved_at)
        return ProjectionModelResult(
            model=model,
            value=target_value,
            units=units,
            meets_condition=meets_condition,
            annual_values=annual_values,
            source_url=source_url,
            retrieved_at_utc=retrieved_at,
            cache_status="cached" if cached else "live",
            grid_cell_latitude=metadata["latitude"],
            grid_cell_longitude=metadata["longitude"],
            dataset_name=metadata["title"],
            dataset_version=metadata["version"],
        )

    def _fetch_json(
        self,
        url: str,
        use_cache: bool,
    ) -> tuple[dict[str, object], bool, str]:
        cache_key = hashlib.sha256(url.encode("utf-8")).hexdigest()
        if use_cache:
            cached_entry = self.cache.get_entry(cache_key)
            if cached_entry and cached_entry.source_url == url and cached_entry.retrieved_at_utc:
                return cached_entry.payload, True, cached_entry.retrieved_at_utc

        request = Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": "Earth-Pulse/0.1 (NASA climate projection client)",
            },
        )
        for attempt in range(self.retries):
            try:
                with urlopen(request, timeout=self.timeout_seconds) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if not isinstance(payload, dict):
                    raise ProjectionUnavailableError("NASA returned a non-object projection response.")
                retrieved_at = datetime.now(timezone.utc).isoformat()
                if use_cache:
                    self.cache.set(cache_key, payload, url, retrieved_at)
                return payload, False, retrieved_at
            except HTTPError as error:
                if (error.code == 429 or error.code >= 500) and attempt + 1 < self.retries:
                    time.sleep(0.5 * (2**attempt))
                    continue
                raise ProjectionUnavailableError(
                    f"NASA POWER Projection API returned HTTP {error.code}."
                ) from error
            except (TimeoutError, socket.timeout, URLError) as error:
                if attempt + 1 < self.retries:
                    time.sleep(0.5 * (2**attempt))
                    continue
                raise ProjectionUnavailableError(
                    "Could not reach NASA POWER Projection API after retries."
                ) from error
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise ProjectionUnavailableError("NASA returned invalid projection JSON.") from error
        raise ProjectionUnavailableError("NASA projection request failed without a response.")

    @staticmethod
    def _metadata(
        source_url: str,
        payload: dict[str, object],
        retrieved_at_utc: str,
    ) -> dict[str, object]:
        try:
            header = payload["header"]
            coordinates = payload["geometry"]["coordinates"]
            return {
                "latitude": float(coordinates[1]),
                "longitude": float(coordinates[0]),
                "title": str(header["title"]),
                "version": str(header["api"]["version"]),
                "source_url": source_url,
                "retrieved_at_utc": retrieved_at_utc,
            }
        except (KeyError, TypeError, ValueError, StopIteration) as error:
            raise ProjectionUnavailableError("NASA projection response metadata is incomplete.") from error


def monthrange_days(year: int, month: int) -> int:
    return monthrange(year, month)[1]


def _annual_projection_values(
    monthly: dict[int, dict[int, float]],
) -> list[ProjectionYearValue]:
    records: list[ProjectionYearValue] = []
    expected_months = set(range(1, 13))
    for year in range(2015, 2101):
        months = monthly.get(year, {})
        value = None
        if expected_months.issubset(months):
            weights = [monthrange_days(year, month) for month in range(1, 13)]
            value = sum(months[month] * weights[month - 1] for month in range(1, 13)) / sum(weights)
        records.append(ProjectionYearValue(year=year, value=value))
    return records
