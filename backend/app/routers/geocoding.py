from fastapi import APIRouter, HTTPException, Query

from app.models.geocoding import GeocodingResult
from app.services.geocoding import GeocodingError, OpenStreetMapGeocoder

router = APIRouter()
geocoder = OpenStreetMapGeocoder()


@router.get(
    "/api/geocode",
    response_model=list[GeocodingResult],
    tags=["geocoding"],
)
def search_places(
    q: str = Query(min_length=3, max_length=200),
) -> list[GeocodingResult]:
    try:
        return geocoder.search(q)
    except GeocodingError as error:
        raise HTTPException(
            status_code=502,
            detail={
                "message": str(error),
                "data_source": "OpenStreetMap Nominatim",
            },
        ) from error
