from fastapi import APIRouter, HTTPException

from app.models.analysis import ProbabilityRequest, ProbabilityResponse
from app.services.nasa_power import DataProviderError
from app.services.probability import ProbabilityUnavailableError, estimate_probability
from app.services.nasa_power import NasaPowerProvider

router = APIRouter()
provider = NasaPowerProvider()


@router.post(
    "/api/probability",
    response_model=ProbabilityResponse,
    tags=["probability"],
)
def get_probability(request: ProbabilityRequest) -> ProbabilityResponse:
    try:
        return estimate_probability(request, provider)
    except ProbabilityUnavailableError as error:
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
