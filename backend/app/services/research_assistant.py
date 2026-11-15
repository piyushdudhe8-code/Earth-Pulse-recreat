import asyncio
import json
import os
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.models.research import (
    ResearchAssistantResponse,
    ResearchDatasetId,
    ResearchDirectionId,
    ResearchVariable,
    ResearchVariableSuggestion,
    ResearchDatasetSuggestion,
    ResearchDirectionSuggestion,
)


class ResearchAssistantUnavailableError(Exception):
    pass


class _Selection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    variables: list[ResearchVariable] = Field(min_length=1, max_length=2)
    datasets: list[ResearchDatasetId] = Field(min_length=1, max_length=3)
    directions: list[ResearchDirectionId] = Field(min_length=1, max_length=4)

    @model_validator(mode="after")
    def reject_duplicate_ids(self) -> "_Selection":
        if any(
            len(items) != len(set(items))
            for items in (self.variables, self.datasets, self.directions)
        ):
            raise ValueError("Suggestions must not contain duplicate IDs.")
        return self


_VARIABLES = {
    ResearchVariable.TEMPERATURE: ResearchVariableSuggestion(
        id=ResearchVariable.TEMPERATURE,
        title="Air temperature",
        description="NASA POWER provides monthly average temperature near 2 metres above the ground.",
        available_in_analysis=True,
    ),
    ResearchVariable.RAINFALL: ResearchVariableSuggestion(
        id=ResearchVariable.RAINFALL,
        title="Rainfall",
        description="NASA POWER provides monthly corrected precipitation estimates.",
        available_in_analysis=True,
    ),
}

_DATASETS = {
    ResearchDatasetId.NASA_POWER: ResearchDatasetSuggestion(
        id=ResearchDatasetId.NASA_POWER,
        title="NASA POWER",
        description="The connected analysis uses its monthly point API for temperature and rainfall.",
        url="https://power.larc.nasa.gov/",
        available_in_analysis=True,
    ),
    ResearchDatasetId.MERRA_2: ResearchDatasetSuggestion(
        id=ResearchDatasetId.MERRA_2,
        title="MERRA-2",
        description="NASA's atmospheric reanalysis used by the current POWER temperature and rainfall records.",
        url="https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/",
        available_in_analysis=True,
    ),
    ResearchDatasetId.GPM_IMERG: ResearchDatasetSuggestion(
        id=ResearchDatasetId.GPM_IMERG,
        title="GPM IMERG",
        description="A NASA precipitation dataset to explore; it is not connected to this app's analysis yet.",
        url="https://gpm.nasa.gov/data/imerg",
        available_in_analysis=False,
    ),
}

_DIRECTIONS = {
    ResearchDirectionId.COMPARE_VARIABLES: (
        "Compare temperature and rainfall over the same years. A relationship does not prove that one causes the other."
    ),
    ResearchDirectionId.CHECK_SEASONAL_PATTERNS: (
        "Ask whether the question is about a season or a whole year; the current trend test uses complete annual values."
    ),
    ResearchDirectionId.COMPARE_NEARBY_PLACES: (
        "Compare a nearby city or region using the same variables and years."
    ),
    ResearchDirectionId.CHECK_DATA_GAPS: (
        "Check how many complete years are available before drawing a conclusion."
    ),
}


def _fallback_selection(question: str) -> _Selection:
    lowered = question.casefold()
    wants_temperature = any(
        word in lowered
        for word in ("temperature", "hot", "heat", "तापमान", "गर्मी")
    )
    wants_rainfall = any(
        word in lowered
        for word in ("rain", "rainfall", "precipitation", "monsoon", "बारिश", "वर्षा", "मानसून")
    )

    variables = []
    if wants_temperature or not wants_rainfall:
        variables.append(ResearchVariable.TEMPERATURE)
    if wants_rainfall or not wants_temperature:
        variables.append(ResearchVariable.RAINFALL)

    datasets = [ResearchDatasetId.NASA_POWER, ResearchDatasetId.MERRA_2]
    if ResearchVariable.RAINFALL in variables:
        datasets.append(ResearchDatasetId.GPM_IMERG)

    directions = [
        ResearchDirectionId.COMPARE_VARIABLES,
        ResearchDirectionId.CHECK_SEASONAL_PATTERNS,
        ResearchDirectionId.COMPARE_NEARBY_PLACES,
        ResearchDirectionId.CHECK_DATA_GAPS,
    ]
    return _Selection(
        variables=variables,
        datasets=datasets,
        directions=directions,
    )


def _read_llm_selection(question: str) -> _Selection:
    api_key = os.getenv("EARTH_PULSE_LLM_API_KEY")
    if not api_key:
        return _fallback_selection(question)

    base_url = os.getenv(
        "EARTH_PULSE_LLM_API_URL",
        "https://api.openai.com/v1/chat/completions",
    )
    model = os.getenv("EARTH_PULSE_LLM_MODEL", "gpt-4o-mini")
    payload = {
        "model": model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Choose relevant IDs only. Return JSON with arrays named variables, datasets, "
                    "and directions. Use only these IDs: variables [temperature, rainfall]; "
                    "datasets [nasa_power, merra_2, gpm_imerg]; directions "
                    "[compare_variables, check_seasonal_patterns, compare_nearby_places, "
                    "check_data_gaps]. Do not write prose, numbers, statistics, trends, causes, "
                    "or facts about any location. GPM IMERG is not connected to the app's analysis."
                ),
            },
            {"role": "user", "content": question},
        ],
    }
    request = Request(
        base_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=12) as response:
            response_body = json.loads(response.read())
    except (TimeoutError, URLError, json.JSONDecodeError) as error:
        raise ResearchAssistantUnavailableError(
            "The optional research assistant is temporarily unavailable."
        ) from error

    try:
        content = response_body["choices"][0]["message"]["content"]
        selection_data: Any = json.loads(content)
        return _Selection.model_validate(selection_data)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as error:
        raise ResearchAssistantUnavailableError(
            "The research assistant returned an unusable suggestion. Please try again."
        ) from error


async def suggest_research(question: str) -> ResearchAssistantResponse:
    selection = await asyncio.to_thread(_read_llm_selection, question)
    mode = "llm" if os.getenv("EARTH_PULSE_LLM_API_KEY") else "guided"
    return ResearchAssistantResponse(
        assistant_mode=mode,
        suggested_variables=[_VARIABLES[item] for item in selection.variables],
        suggested_datasets=[_DATASETS[item] for item in selection.datasets],
        research_directions=[
            ResearchDirectionSuggestion(id=item, description=_DIRECTIONS[item])
            for item in selection.directions
        ],
    )
