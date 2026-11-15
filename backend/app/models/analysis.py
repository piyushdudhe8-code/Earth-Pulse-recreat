from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


Variable = Literal["temperature", "rainfall"]
TrendDirection = Literal["increasing", "decreasing", "no clear trend"]


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    variable: Variable
    start_year: int | None = Field(default=None, ge=1981)
    end_year: int | None = Field(default=None, ge=1981)
    frequency: Literal["monthly"]

    @model_validator(mode="after")
    def validate_year_range(self) -> "AnalyzeRequest":
        if (self.start_year is None) != (self.end_year is None):
            raise ValueError("start_year and end_year must both be provided or omitted")
        if self.start_year is not None and self.end_year is not None and self.end_year < self.start_year:
            raise ValueError("end_year must be greater than or equal to start_year")
        if self.end_year is not None and self.end_year > date.today().year:
            raise ValueError("end_year cannot be in the future")
        return self


class SeriesPoint(BaseModel):
    period: str
    value: float | None
    trend_value: float | None = None
    confidence_lower: float | None = None
    confidence_upper: float | None = None


class TimeSeries(BaseModel):
    frequency: Literal["monthly", "annual"]
    units: str
    records: list[SeriesPoint]


class LinearRegressionResult(BaseModel):
    slope_per_year: float
    intercept: float
    p_value: float
    confidence_interval_95: tuple[float, float]
    r_squared: float


class TrendResult(BaseModel):
    direction: TrendDirection
    rate_of_change: float
    rate_units: str
    significant: bool
    test_names: list[str]
    mann_kendall_test: str
    mann_kendall_p_value: float
    sen_slope_per_year: float
    linear_regression: LinearRegressionResult


class DataAvailability(BaseModel):
    expected_months: int
    missing_months: int
    complete_years: int
    incomplete_years: list[int]


class DatasetMetadata(BaseModel):
    name: str
    version: str
    source: str
    data_type: str
    parameter_name: str
    source_units: str
    monthly_units: str
    annual_units: str
    requested_start_year: int
    requested_end_year: int
    first_observation: str | None
    last_observation: str | None
    aggregation: str
    source_url: str
    retrieved_at_utc: str
    cache_status: Literal["live", "cached"]
    grid_cell_latitude: float
    grid_cell_longitude: float


class AnalyzeResponse(BaseModel):
    latitude: float
    longitude: float
    variable: Variable
    monthly_time_series: TimeSeries
    annual_time_series: TimeSeries
    data_availability: DataAvailability
    trend: TrendResult
    dataset: DatasetMetadata
    limitations: list[str]
    plain_language: str


class ProbabilityRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    variable: Variable
    condition: Literal["above", "below"]
    threshold: float
    time_window: Literal["next_summer", "year"]
    target_year: int | None = Field(default=None, ge=1981, le=2100)
    start_year: int | None = Field(default=None, ge=1981)
    end_year: int | None = Field(default=None, ge=1981)

    @model_validator(mode="after")
    def validate_period(self) -> "ProbabilityRequest":
        if (self.start_year is None) != (self.end_year is None):
            raise ValueError("start_year and end_year must both be provided or omitted")
        if self.start_year is not None and self.end_year is not None and self.end_year < self.start_year:
            raise ValueError("end_year must be greater than or equal to start_year")
        if self.end_year is not None and self.end_year >= date.today().year:
            raise ValueError("end_year must be a complete historical year")
        if self.time_window == "year":
            if self.target_year is None:
                raise ValueError("target_year is required for a calendar-year estimate")
            if self.target_year <= date.today().year:
                raise ValueError("target_year must be in the future")
        elif self.target_year is not None:
            raise ValueError("target_year is calculated automatically for next_summer")
        return self


class HistoricalPeriodValue(BaseModel):
    year: int
    value: float


class ProbabilityDataUsed(BaseModel):
    dataset_name: str
    dataset_version: str
    source: str
    data_type: str
    parameter_name: str
    source_units: str
    analysis_units: str
    requested_start_year: int
    requested_end_year: int
    complete_periods: int
    missing_periods: int
    source_url: str
    retrieved_at_utc: str
    cache_status: Literal["live", "cached"]
    grid_cell_latitude: float
    grid_cell_longitude: float
    historical_values: list[HistoricalPeriodValue]
    trend_direction: TrendDirection
    trend_significant: bool
    trend_rate_per_decade: float


class ProbabilityResponse(BaseModel):
    latitude: float
    longitude: float
    variable: Variable
    condition: Literal["above", "below"]
    threshold: float
    units: str
    time_window: str
    target_year: int
    target_months: list[str]
    probability_percent: float
    confidence_range_percent: tuple[float, float]
    historical_events: int
    historical_periods: int
    historical_probability_percent: float
    method: str
    data_used: ProbabilityDataUsed
    assumptions: list[str]
    limitations: list[str]
    plain_language: str
