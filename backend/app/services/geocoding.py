import hashlib
import json
import time
from threading import Lock
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.models.geocoding import GeocodingResult
from app.services.cache import SQLiteResponseCache


class GeocodingError(Exception):
    pass


class OpenStreetMapGeocoder:
    API_URL = "https://nominatim.openstreetmap.org/search"
    _rate_limit_lock = Lock()
    _last_request_at = 0.0

    def __init__(
        self,
        cache: SQLiteResponseCache | None = None,
        timeout_seconds: float = 10,
    ) -> None:
        self.cache = cache or SQLiteResponseCache(ttl_seconds=30 * 24 * 60 * 60)
        self.timeout_seconds = timeout_seconds

    def search(self, query: str) -> list[GeocodingResult]:
        normalized_query = " ".join(query.split())
        cache_key = hashlib.sha256(
            f"nominatim-v1:{normalized_query.casefold()}".encode("utf-8")
        ).hexdigest()
        cached = self.cache.get(cache_key)
        if cached is not None:
            results = cached.get("results")
            if not isinstance(results, list):
                raise GeocodingError("Cached place search result has an invalid format")
            return [GeocodingResult.model_validate(result) for result in results]

        parameters = urlencode(
            {
                "q": normalized_query,
                "format": "jsonv2",
                "limit": 5,
                "addressdetails": 0,
            }
        )
        request = Request(
            f"{self.API_URL}?{parameters}",
            headers={
                "Accept": "application/json",
                "User-Agent": "Earth-Pulse/0.1 (NASA Space Apps Challenge project)",
            },
        )
        with self._rate_limit_lock:
            wait_seconds = 1.0 - (time.monotonic() - self._last_request_at)
            if wait_seconds > 0:
                time.sleep(wait_seconds)
            self.__class__._last_request_at = time.monotonic()
            payload = self._request_json(request)

        results = self._parse_results(payload)
        self.cache.set(cache_key, {"results": [result.model_dump() for result in results]})
        return results

    def _request_json(self, request: Request) -> Any:
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raise GeocodingError(
                f"OpenStreetMap place search returned HTTP {error.code}"
            ) from error
        except (TimeoutError, URLError) as error:
            raise GeocodingError(f"Could not reach OpenStreetMap place search: {error}") from error
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise GeocodingError("OpenStreetMap returned invalid JSON") from error

    @staticmethod
    def _parse_results(payload: Any) -> list[GeocodingResult]:
        if not isinstance(payload, list):
            raise GeocodingError("OpenStreetMap returned an unexpected place-search response")
        results: list[GeocodingResult] = []
        for item in payload:
            if not isinstance(item, dict):
                raise GeocodingError("OpenStreetMap returned an invalid place result")
            try:
                results.append(
                    GeocodingResult(
                        display_name=str(item["display_name"]),
                        latitude=float(item["lat"]),
                        longitude=float(item["lon"]),
                    )
                )
            except (KeyError, TypeError, ValueError) as error:
                raise GeocodingError("OpenStreetMap returned a place without valid coordinates") from error
        return results
