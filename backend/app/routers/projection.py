from fastapi import APIRouter, HTTPException

from app.models.catalog import ProjectionModelCatalog, ProjectionRequest, ProjectionResponse
from app.services.projection import NasaProjectionProvider, ProjectionUnavailableError

router = APIRouter()
provider = NasaProjectionProvider()


@router.get(
    "/api/projection/models",
    response_model=ProjectionModelCatalog,
    tags=["projection"],
)
def get_projection_models() -> ProjectionModelCatalog:
    try:
        return provider.discover_models()
    except ProjectionUnavailableError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "message": str(error),
                "data_source": "NASA POWER Projection API",
            },
        ) from error


@router.post(
    "/api/projection/analyze",
    response_model=ProjectionResponse,
    tags=["projection"],
)
def analyze_projection(request: ProjectionRequest) -> ProjectionResponse:
    try:
        return provider.analyze(request)
    except ProjectionUnavailableError as error:
        raise HTTPException(
            status_code=422 if error.availability else 502,
            detail={
                "message": str(error),
                "data_source": "NASA POWER Projection API",
                "data_availability": error.availability,
            },
        ) from error
