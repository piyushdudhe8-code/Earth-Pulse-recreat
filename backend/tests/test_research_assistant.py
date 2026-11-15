import asyncio
import io
import json

import pytest

from app.models.catalog import (
    CMRCollection,
    CMRLink,
    CMRSearchResponse,
)
from app.models.research import ResearchAssistantRequest
from app.services import research_assistant


def _catalog_result():
    item = CMRCollection(
        title="Synthetic precipitation catalogue test",
        short_name="SYNTH_TEST",
        version="01",
        provider="TEST_PROVIDER",
        abstract="Synthetic metadata fixture used only in this test.",
        temporal_start="2000-01-01",
        temporal_end="2025-01-01",
        spatial_coverage=["-90 -180 90 180"],
        concept_id="C0000000000-TEST",
        official_links=[
            CMRLink(
                title="Test metadata",
                rel="metadata",
                href="https://cmr.earthdata.nasa.gov/test",
                type="application/json",
            )
        ],
        metadata_only_notice="Test metadata only.",
        access_note="Test access note.",
    )
    return CMRSearchResponse(
        search_url="https://cmr.earthdata.nasa.gov/search/collections.json?keyword=precipitation",
        result_count=1,
        collections=[item],
        metadata_only_notice="Test metadata only.",
    )


def test_guided_suggestions_are_limited_to_connected_variables(monkeypatch):
    monkeypatch.delenv("EARTH_PULSE_LLM_API_KEY", raising=False)
    monkeypatch.setattr(research_assistant, "search_collections", lambda _request: _catalog_result())

    response = asyncio.run(
        research_assistant.suggest_research(
            "Why should I study rainfall changes in Maharashtra?"
        )
    )

    assert response.assistant_mode == "guided"
    assert [item.id.value for item in response.suggested_variables] == ["rainfall"]
    assert all(item.available_in_analysis for item in response.suggested_variables)
    assert response.suggested_datasets[0].concept_id == "C0000000000-TEST"
    assert "not downloaded or analyzed" in response.metadata_only_notice


def test_llm_can_only_select_preapproved_recommendations(monkeypatch):
    monkeypatch.setenv("EARTH_PULSE_LLM_API_KEY", "test-token")
    response_body = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "variables": ["temperature"],
                            "directions": ["check_data_gaps"],
                        }
                    )
                }
            }
        ]
    }

    class FakeResponse(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            self.close()

    def fake_urlopen(_request, timeout):
        assert timeout == 12
        return FakeResponse(json.dumps(response_body).encode())

    monkeypatch.setattr(research_assistant, "urlopen", fake_urlopen)
    monkeypatch.setattr(research_assistant, "search_collections", lambda _request: _catalog_result())
    response = asyncio.run(
        research_assistant.suggest_research(
            "Find a safe starting point for a local project."
        )
    )

    assert response.assistant_mode == "llm"
    assert [item.id.value for item in response.suggested_variables] == ["temperature"]
    assert response.suggested_datasets[0].short_name == "SYNTH_TEST"
    assert "complete years" in response.research_directions[0].description


def test_research_assistant_question_has_a_bounded_length():
    with pytest.raises(ValueError):
        ResearchAssistantRequest(question="short")

    with pytest.raises(ValueError):
        ResearchAssistantRequest(question="x" * 501)


def test_llm_cannot_return_unapproved_ids(monkeypatch):
    monkeypatch.setenv("EARTH_PULSE_LLM_API_KEY", "test-token")
    response_body = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "variables": ["soil_moisture"],
                            "directions": ["check_data_gaps"],
                        }
                    )
                }
            }
        ]
    }

    class FakeResponse(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            self.close()

    monkeypatch.setattr(
        research_assistant,
        "urlopen",
        lambda *_args, **_kwargs: FakeResponse(json.dumps(response_body).encode()),
    )
    with pytest.raises(research_assistant.ResearchAssistantUnavailableError):
        asyncio.run(
            research_assistant.suggest_research(
                "Recommend the soil moisture variable."
            )
        )
