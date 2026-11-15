import io
import json
from urllib.parse import parse_qs, urlparse

from app.models.catalog import CMRSearchRequest
from app.services import cmr


def test_cmr_search_maps_supported_filters_and_real_collection_metadata(monkeypatch):
    observed = {}
    payload = {
        "feed": {
            "entry": [
                {
                    "id": "C2723754864-GES_DISC",
                    "title": "GPM IMERG Final Precipitation",
                    "short_name": "GPM_3IMERGDF",
                    "version_id": "07",
                    "data_center": "GES_DISC",
                    "summary": "Metadata abstract from CMR.",
                    "time_start": "1998-01-01T00:00:00.000Z",
                    "time_end": "2025-09-30T23:59:59.999Z",
                    "boxes": ["-90 -180 90 180"],
                    "links": [
                        {
                            "rel": "http://esipfed.org/ns/fedsearch/1.1/data#",
                            "href": "https://data.example.nasa.gov/file",
                        }
                    ],
                }
            ]
        }
    }

    def fake_request(url):
        observed["url"] = url
        return payload, "2137"

    monkeypatch.setattr(cmr, "_request_json", fake_request)
    result = cmr.search_collections(
        CMRSearchRequest(
            variable="precipitation",
            topic="Precipitation",
            name="GPM IMERG",
            start_time="2020-01-01T00:00:00Z",
            end_time="2021-01-01T00:00:00Z",
            west=-10,
            south=-5,
            east=10,
            north=5,
            page_size=1,
        )
    )

    assert "keyword=precipitation" in observed["url"]
    assert "science_keywords%5B0%5D%5Bterm%5D=Precipitation" in observed["url"]
    assert "entry_title=GPM+IMERG" in observed["url"]
    assert "temporal=" in observed["url"]
    query = parse_qs(urlparse(observed["url"]).query)
    assert query["bounding_box[]"] == ["-10.0,-5.0,10.0,5.0"]
    assert result.result_count == 2137
    collection = result.collections[0]
    assert collection.title == "GPM IMERG Final Precipitation"
    assert collection.short_name == "GPM_3IMERGDF"
    assert collection.version == "07"
    assert collection.provider == "GES_DISC"
    assert collection.abstract == "Metadata abstract from CMR."
    assert collection.temporal_start.startswith("1998")
    assert collection.spatial_coverage == ["-90 -180 90 180"]
    assert collection.concept_id == "C2723754864-GES_DISC"
    assert any(link.href.endswith("/file") for link in collection.official_links)
    assert "not downloaded or analyzed" in collection.metadata_only_notice
    assert "Earthdata Login" in collection.access_note


def test_cmr_rejects_partial_geographic_bounds(monkeypatch):
    monkeypatch.setattr(cmr, "_request_json", lambda _url: ({}, None))
    try:
        cmr.search_collections(CMRSearchRequest(west=1))
    except ValueError as error:
        assert "All four geographic bounds" in str(error)
    else:
        raise AssertionError("partial bounds should not be accepted")


def test_cmr_request_sets_json_accept_header(monkeypatch):
    observed = {}

    class FakeResponse(io.BytesIO):
        headers = {"CMR-Hits": "0"}

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            self.close()

    def fake_urlopen(request, timeout):
        observed["accept"] = request.get_header("Accept")
        observed["timeout"] = timeout
        return FakeResponse(json.dumps({"feed": {"entry": []}}).encode())

    monkeypatch.setattr(cmr, "urlopen", fake_urlopen)
    body, hits = cmr._request_json(cmr.CMR_COLLECTIONS_URL)
    assert observed == {"accept": "application/json", "timeout": 20}
    assert body == {"feed": {"entry": []}}
    assert hits == "0"
