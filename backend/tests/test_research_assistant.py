import asyncio
import io
import json

import pytest

from app.models.research import ResearchAssistantRequest
from app.services import research_assistant


def test_guided_suggestions_are_limited_to_connected_variables(monkeypatch):
    monkeypatch.delenv("EARTH_PULSE_LLM_API_KEY", raising=False)

    response = asyncio.run(
        research_assistant.suggest_research(
            "Why should I study rainfall changes in Maharashtra?"
        )
    )

    assert response.assistant_mode == "guided"
    assert [item.id.value for item in response.suggested_variables] == ["rainfall"]
    assert all(item.available_in_analysis for item in response.suggested_variables)
    assert any(item.id.value == "gpm_imerg" for item in response.suggested_datasets)
    assert not next(
        item for item in response.suggested_datasets if item.id.value == "gpm_imerg"
    ).available_in_analysis


def test_llm_can_only_select_preapproved_recommendations(monkeypatch):
    monkeypatch.setenv("EARTH_PULSE_LLM_API_KEY", "test-token")
    response_body = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "variables": ["temperature"],
                            "datasets": ["nasa_power"],
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
    response = asyncio.run(
        research_assistant.suggest_research(
            "Find a safe starting point for a local project."
        )
    )

    assert response.assistant_mode == "llm"
    assert [item.id.value for item in response.suggested_variables] == ["temperature"]
    assert [item.id.value for item in response.suggested_datasets] == ["nasa_power"]
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
                            "datasets": ["nasa_power"],
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
