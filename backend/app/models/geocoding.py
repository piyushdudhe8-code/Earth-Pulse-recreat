from pydantic import BaseModel


class GeocodingResult(BaseModel):
    display_name: str
    latitude: float
    longitude: float
