import json
import socket
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.models.catalog import (
    CMRCollection,
    CMRLink,
    CMRSearchRequest,
    CMRSearchResponse,
)


CMR_COLLECTIONS_URL = "https://cmr.earthdata.nasa.gov/search/collections.json"
CMR_METADATA_NOTICE = (
    "CMR is a metadata catalogue only. Earth Pulse has not downloaded or analyzed "
    "the data described by these records."
)
EARTHDATA_ACCESS_NOTE = (
    "A public metadata record does not confirm data access. The linked dataset may "
    "require a NASA Earthdata Login or additional access permissions."
)


class CMRUnavailableError(Exception):
    pass


def search_collections(request: CMRSearchRequest) -> CMRSearchResponse:
    params: dict[str, str | int] = {"page_size": request.page_size}
    if request.variable and request.variable.strip():
        params["keyword"] = request.variable.strip()
    if request.topic and request.topic.strip():
        params["science_keywords[0][term]"] = request.topic.strip()
    if request.name and request.name.strip():
        params["entry_title"] = request.name.strip()
    if request.start_time or request.end_time:
        params["temporal"] = f"{request.start_time or ''},{request.end_time or ''}"
    bounds = (request.west, request.south, request.east, request.north)
    if all(value is not None for value in bounds):
        west, south, east, north = bounds
        if south is None or north is None or south > north:
            raise ValueError("south must not be greater than north")
        params["bounding_box[]"] = ",".join(
            str(value) for value in (west, south, east, north)
        )
    elif any(value is not None for value in bounds):
        raise ValueError("All four geographic bounds are required together")

    url = f"{CMR_COLLECTIONS_URL}?{urlencode(params)}"
    payload, hits = _request_json(url)
    try:
        feed = payload["feed"]
        entries = feed.get("entry", [])
        if not isinstance(entries, list):
            raise TypeError("collection entry is not a list")
        collections = [_parse_entry(entry) for entry in entries if isinstance(entry, dict)]
    except (KeyError, TypeError) as error:
        raise CMRUnavailableError("NASA CMR returned an unexpected collections response.") from error

    result_count = _parse_count(hits, len(collections))
    return CMRSearchResponse(
        search_url=url,
        result_count=result_count,
        collections=collections,
        metadata_only_notice=CMR_METADATA_NOTICE,
    )


def _parse_entry(entry: dict[str, object]) -> CMRCollection:
    concept_id = _string(entry.get("id"))
    if not concept_id:
        raise CMRUnavailableError("NASA CMR returned a collection without a concept ID.")
    title = _string(entry.get("title")) or _string(entry.get("dataset_id"))
    short_name = _string(entry.get("short_name"))
    version = _string(entry.get("version_id"))
    provider = _string(entry.get("data_center"))
    boxes = entry.get("boxes")
    polygons = entry.get("polygons")
    spatial_coverage = [
        json.dumps(item, ensure_ascii=False) if isinstance(item, (dict, list)) else item
        for collection in (boxes, polygons)
        if isinstance(collection, list)
        for item in collection
        if isinstance(item, (str, dict, list))
    ]
    links: list[CMRLink] = [
        CMRLink(
            title="CMR collection metadata",
            rel="https://cmr.earthdata.nasa.gov/search/collections",
            href=(
                "https://cmr.earthdata.nasa.gov/search/collections.json?"
                + urlencode({"concept_id": concept_id})
            ),
            type="application/json",
        )
    ]
    raw_links = entry.get("links")
    if isinstance(raw_links, list):
        for item in raw_links:
            if not isinstance(item, dict):
                continue
            href = _string(item.get("href"))
            if not href.startswith("https://"):
                continue
            if any(link.href == href for link in links):
                continue
            links.append(
                CMRLink(
                    title=_string(item.get("title")) or None,
                    rel=_string(item.get("rel")) or None,
                    href=href,
                    type=_string(item.get("type")) or None,
                )
            )

    return CMRCollection(
        title=title or None,
        short_name=short_name or None,
        version=version or None,
        provider=provider or None,
        abstract=_string(entry.get("summary")),
        temporal_start=_string(entry.get("time_start")) or None,
        temporal_end=_string(entry.get("time_end")) or None,
        spatial_coverage=spatial_coverage,
        concept_id=concept_id,
        official_links=links,
        metadata_only_notice=CMR_METADATA_NOTICE,
        access_note=EARTHDATA_ACCESS_NOTE,
    )


def _string(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def _parse_count(value: str | None, fallback: int) -> int:
    try:
        count = int(value or "")
    except ValueError:
        return fallback
    return max(0, count)


def _request_json(url: str) -> tuple[dict[str, object], str | None]:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Earth-Pulse/0.1 (NASA CMR metadata search)",
        },
    )
    for attempt in range(3):
        try:
            with urlopen(request, timeout=20) as response:
                body = json.loads(response.read().decode("utf-8"))
                hits = response.headers.get("CMR-Hits")
            if not isinstance(body, dict):
                raise CMRUnavailableError("NASA CMR returned a response that was not a JSON object.")
            return body, hits
        except HTTPError as error:
            if error.code == 429 or 500 <= error.code < 600:
                if attempt < 2:
                    time.sleep(0.5 * (2**attempt))
                    continue
            raise CMRUnavailableError(f"NASA CMR returned HTTP {error.code}.") from error
        except (TimeoutError, socket.timeout, URLError) as error:
            if attempt < 2:
                time.sleep(0.5 * (2**attempt))
                continue
            raise CMRUnavailableError("Could not reach NASA CMR after three attempts.") from error
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise CMRUnavailableError("NASA CMR returned invalid JSON.") from error
    raise CMRUnavailableError("NASA CMR request failed without a response.")
