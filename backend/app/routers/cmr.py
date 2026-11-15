from fastapi import APIRouter, Depends, HTTPException

from app.models.catalog import CMRSearchRequest, CMRSearchResponse
from app.services.cmr import CMRUnavailableError, search_collections

router = APIRouter()


@router.get(
    "/api/cmr/collections",
    response_model=CMRSearchResponse,
    tags=["metadata catalogue"],
)
def get_collections(
    request: CMRSearchRequest = Depends(),
) -> CMRSearchResponse:
    try:
        return search_collections(request)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except CMRUnavailableError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "message": str(error),
                "data_source": "NASA CMR metadata catalogue",
            },
        ) from error
