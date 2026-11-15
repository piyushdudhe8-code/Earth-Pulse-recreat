from fastapi import APIRouter, HTTPException

from app.models.analysis import AnalyzeRequest, AnalyzeResponse
from app.services.analysis import AnalysisUnavailableError, analyze_location
from app.services.nasa_power import DataProviderError, NasaPowerProvider

router = APIRouter()
provider = NasaPowerProvider()


@router.post("/api/analyze", response_model=AnalyzeResponse, tags=["analysis"])
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    try:
        return analyze_location(request, provider)
    except AnalysisUnavailableError as error:
        raise HTTPException(
            status_code=422,
            detail={
                "message": str(error),
                "data_availability": error.availability,
            },
        ) from error
    except DataProviderError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "message": str(error),
                "data_source": "NASA POWER",
            },
        ) from error
