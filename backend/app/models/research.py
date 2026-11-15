from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.catalog import CMRCollection

class ResearchVariable(str, Enum):
    TEMPERATURE = "temperature"
    RAINFALL = "rainfall"


class ResearchDirectionId(str, Enum):
    COMPARE_VARIABLES = "compare_variables"
    CHECK_SEASONAL_PATTERNS = "check_seasonal_patterns"
    COMPARE_NEARBY_PLACES = "compare_nearby_places"
    CHECK_DATA_GAPS = "check_data_gaps"


class ResearchAssistantRequest(BaseModel):
    question: str = Field(min_length=8, max_length=500)


class ResearchVariableSuggestion(BaseModel):
    id: ResearchVariable
    title: str
    description: str
    available_in_analysis: bool


class ResearchDirectionSuggestion(BaseModel):
    id: ResearchDirectionId
    description: str


class ResearchAssistantResponse(BaseModel):
    assistant_mode: Literal["llm", "guided"]
    suggested_variables: list[ResearchVariableSuggestion]
    suggested_datasets: list[CMRCollection]
    research_directions: list[ResearchDirectionSuggestion]
    metadata_only_notice: str
