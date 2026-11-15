from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CMRSearchRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    variable: str | None = Field(default=None, max_length=100)
    topic: str | None = Field(default=None, max_length=200)
    name: str | None = Field(default=None, max_length=200)
    start_time: str | None = Field(default=None, max_length=40)
    end_time: str | None = Field(default=None, max_length=40)
    west: float | None = Field(default=None, ge=-180, le=180)
    south: float | None = Field(default=None, ge=-90, le=90)
    east: float | None = Field(default=None, ge=-180, le=180)
    north: float | None = Field(default=None, ge=-90, le=90)
    page_size: int = Field(default=10, ge=1, le=25)


class CMRLink(BaseModel):
    title: str | None = None
    rel: str | None = None
    href: str
    type: str | None = None


class CMRCollection(BaseModel):
    title: str | None = None
    short_name: str | None = None
    version: str | None = None
    provider: str | None = None
    abstract: str
    temporal_start: str | None = None
    temporal_end: str | None = None
    spatial_coverage: list[str]
    concept_id: str
    official_links: list[CMRLink]
    metadata_only_notice: str
    access_note: str


class CMRSearchResponse(BaseModel):
    search_url: str
    result_count: int
    collections: list[CMRCollection]
    metadata_only_notice: str


class ProjectionRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    lat: float = Field(ge=-59.875, le=89.875)
    lon: float = Field(ge=-179.875, le=179.875)
    variable: Literal["temperature", "rainfall"]
    condition: Literal["above", "below"]
    threshold: float
    scenario: Literal["ssp126", "ssp245", "ssp370"]
    target_year: int = Field(ge=2015, le=2100)


class ProjectionYearValue(BaseModel):
    year: int
    value: float | None


class ProjectionModelResult(BaseModel):
    model: str
    value: float | None
    units: str
    meets_condition: bool | None
    annual_values: list[ProjectionYearValue]
    source_url: str
    retrieved_at_utc: str
    cache_status: str
    grid_cell_latitude: float
    grid_cell_longitude: float
    dataset_name: str
    dataset_version: str


class ProjectionResponse(BaseModel):
    latitude: float
    longitude: float
    grid_cell_latitude: float
    grid_cell_longitude: float
    variable: str
    parameter_name: str
    units: str
    scenario: str
    target_year: int
    condition: str
    threshold: float
    discovered_models: list[str]
    models_with_target_data: int
    models_meeting_condition: int | None
    ensemble: ProjectionModelResult | None
    model_results: list[ProjectionModelResult]
    interpretation: str
    dataset_name: str
    dataset_version: str
    source: str
    data_type: str
    temporal_coverage: str
    retrieved_at_utc: str
    cache_status: str
    source_urls: list[str]
    limitations: list[str]


class ProjectionModelCatalog(BaseModel):
    temporal: str
    models: list[str]
    catalog_url: str
    retrieved_at_utc: str
