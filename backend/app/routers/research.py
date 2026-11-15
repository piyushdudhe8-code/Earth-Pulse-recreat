from fastapi import APIRouter, HTTPException

from app.models.research import ResearchAssistantRequest, ResearchAssistantResponse
from app.services.research_assistant import (
    ResearchAssistantUnavailableError,
    suggest_research,
)

router = APIRouter()


@router.post(
    "/api/research-assistant",
    response_model=ResearchAssistantResponse,
    tags=["research"],
)
async def research_assistant(
    request: ResearchAssistantRequest,
) -> ResearchAssistantResponse:
    try:
        return await suggest_research(request.question)
    except ResearchAssistantUnavailableError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
