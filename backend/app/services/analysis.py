from calendar import monthrange
from dataclasses import dataclass

import numpy as np
import pandas as pd

from app.models.analysis import (
    AnalyzeRequest,
    AnalyzeResponse,
    DataAvailability,
    DatasetMetadata,
    LinearRegressionResult,
    SeriesPoint,
    TimeSeries,
    TrendResult,
)
from app.services.data_provider import DataProvider, MonthlyDataset
from app.services.statistics import (
    MINIMUM_COMPLETE_YEARS,
    InsufficientDataError,
    calculate_trend,
)


class AnalysisUnavailableError(Exception):
    def __init__(self, message: str, availability: dict[str, object]) -> None:
        super().__init__(message)
        self.availability = availability


@dataclass(frozen=True)
class PreparedSeries:
    monthly: list[SeriesPoint]
    annual: list[SeriesPoint]
    annual_years: list[int]
    annual_values: list[float]
    expected_months: int
    missing_months: int
    incomplete_years: list[int]
    first_observation: str | None
    last_observation: str | None
    monthly_units: str
    annual_units: str
    aggregation: str


def analyze_location(
    request: AnalyzeRequest,
    provider: DataProvider,
) -> AnalyzeResponse:
    dataset = provider.fetch_monthly(
        latitude=request.lat,
        longitude=request.lon,
        variable=request.variable,
        start_year=request.start_year,
        end_year=request.end_year,
    )
    if request.start_year is None:
        selected_years = dataset.selected_years or ()
        if not selected_years:
            raise AnalysisUnavailableError(
                "NASA POWER did not return any complete years for this location.",
                {
                    "requested_complete_years": 20,
                    "complete_years": 0,
                    "source_url": dataset.source_url,
                },
            )
        analysis_request = request.model_copy(
            update={
                "start_year": selected_years[0],
                "end_year": selected_years[-1],
            }
        )
    else:
        analysis_request = request

    if analysis_request.start_year is None or analysis_request.end_year is None:
        raise ValueError("The analysis period could not be resolved from NASA data")
    prepared = _prepare_series(dataset, analysis_request)
    availability = {
        "requested_start_year": analysis_request.start_year,
        "requested_end_year": analysis_request.end_year,
        "expected_months": prepared.expected_months,
        "missing_months": prepared.missing_months,
        "complete_years": len(prepared.annual_years),
        "incomplete_years": prepared.incomplete_years,
        "minimum_complete_years_required": MINIMUM_COMPLETE_YEARS,
        "first_observation": prepared.first_observation,
        "last_observation": prepared.last_observation,
    }
    if len(prepared.annual_years) < MINIMUM_COMPLETE_YEARS:
        raise AnalysisUnavailableError(
            (
                f"NASA POWER returned {len(prepared.annual_years)} complete years of data; "
                f"at least {MINIMUM_COMPLETE_YEARS} are required for trend analysis."
            ),
            availability,
        )

    try:
        statistics = calculate_trend(prepared.annual_years, prepared.annual_values)
    except InsufficientDataError as error:
        raise AnalysisUnavailableError(str(error), availability) from error

    temperature = request.variable == "temperature"
    rate_units = f"{dataset.source_units} per decade"
    rate_of_change = statistics.sen_slope_per_year * 10
    variable_name = (
        "annual average temperature"
        if temperature
        else "annual average corrected precipitation rate"
    )
    trend_word = {
        "increasing": "increased",
        "decreasing": "decreased",
        "no clear trend": "has no clear upward or downward trend",
    }[statistics.direction]
    if statistics.direction == "no clear trend":
        plain_language = (
            f"From {prepared.first_observation} to {prepared.last_observation}, the "
            f"{variable_name} {trend_word}. The estimated rate is "
            f"{rate_of_change:.2f} {rate_units}; the Mann-Kendall test "
            f"{'found a statistically clear trend' if statistics.significant else 'did not find a statistically clear trend'} "
            f"(p = {statistics.mann_kendall_p_value:.3f}). This describes the data and "
            "does not explain what caused the pattern."
        )
    else:
        plain_language = (
            f"From {prepared.first_observation} to {prepared.last_observation}, the "
            f"{variable_name} {trend_word}. The estimated change is "
            f"{abs(rate_of_change):.2f} {rate_units}; the Mann-Kendall test "
            f"{'found a statistically clear trend' if statistics.significant else 'did not find a statistically clear trend'} "
            f"(p = {statistics.mann_kendall_p_value:.3f}). This describes the data and "
            "does not explain what caused the change."
        )

    annual_records = []
    for record in prepared.annual:
        band = statistics.regression_band.get(int(record.period))
        annual_records.append(
            SeriesPoint(
                period=record.period,
                value=record.value,
                trend_value=band[0] if band else None,
                confidence_lower=band[1] if band else None,
                confidence_upper=band[2] if band else None,
            )
        )

    return AnalyzeResponse(
        latitude=request.lat,
        longitude=request.lon,
        variable=request.variable,
        monthly_time_series=TimeSeries(
            frequency="monthly",
            units=prepared.monthly_units,
            records=prepared.monthly,
        ),
        annual_time_series=TimeSeries(
            frequency="annual",
            units=prepared.annual_units,
            records=annual_records,
        ),
        data_availability=DataAvailability(
            expected_months=prepared.expected_months,
            missing_months=prepared.missing_months,
            complete_years=len(prepared.annual_years),
            incomplete_years=prepared.incomplete_years,
        ),
        trend=TrendResult(
            direction=statistics.direction,
            rate_of_change=rate_of_change,
            rate_units=rate_units,
            significant=statistics.significant,
            test_names=[
                "Original Mann-Kendall test on annual values",
                "Sen's slope on annual values",
                "Ordinary least squares regression on annual values",
            ],
            mann_kendall_test="Original Mann-Kendall test on annual values",
            mann_kendall_p_value=statistics.mann_kendall_p_value,
            sen_slope_per_year=statistics.sen_slope_per_year,
            linear_regression=LinearRegressionResult(
                slope_per_year=statistics.regression_slope_per_year,
                intercept=statistics.regression_intercept,
                p_value=statistics.regression_p_value,
                confidence_interval_95=(
                    statistics.regression_ci_lower,
                    statistics.regression_ci_upper,
                ),
                r_squared=statistics.r_squared,
            ),
        ),
        dataset=DatasetMetadata(
            name=dataset.dataset_name,
            version=dataset.version,
            source=dataset.source,
            data_type="reanalysis / model-derived",
            parameter_name=dataset.parameter_name,
            source_units=dataset.source_units,
            monthly_units=prepared.monthly_units,
            annual_units=prepared.annual_units,
            requested_start_year=analysis_request.start_year,
            requested_end_year=analysis_request.end_year,
            first_observation=prepared.first_observation,
            last_observation=prepared.last_observation,
            aggregation=prepared.aggregation,
            source_url=dataset.source_url,
            retrieved_at_utc=dataset.retrieved_at_utc,
            cache_status=dataset.cache_status,
            grid_cell_latitude=dataset.grid_cell_latitude,
            grid_cell_longitude=dataset.grid_cell_longitude,
        ),
        limitations=[
            "The point query represents the nearest NASA grid cell, not a measurement at the exact location.",
            "This analysis uses complete calendar-year means, so within-year seasonal changes are not shown in the trend test.",
            "The Mann–Kendall test does not adjust for serial correlation between years.",
            "A trend describes a pattern in this record; it does not identify a cause.",
            "NASA may revise historical data, and missing monthly values reduce the usable record.",
        ],
        plain_language=plain_language,
    )


def _prepare_series(dataset: MonthlyDataset, request: AnalyzeRequest) -> PreparedSeries:
    if dataset.selected_years is not None:
        years = dataset.selected_years
    elif request.start_year is not None and request.end_year is not None:
        years = tuple(range(request.start_year, request.end_year + 1))
    else:
        raise ValueError("The analysis period could not be resolved from NASA data")
    periods = [
        pd.Period(year=year, month=month, freq="M")
        for year in years
        for month in range(1, 13)
    ]
    expected_periods = [str(period).replace("-", "") for period in periods]
    source_values = [dataset.observations.get(period) for period in expected_periods]
    frame = pd.DataFrame(
        {
            "period": periods,
            "source_value": source_values,
            "days": [monthrange(period.year, period.month)[1] for period in periods],
        }
    )
    frame["year"] = [period.year for period in periods]
    frame["valid"] = frame["source_value"].map(
        lambda value: value is not None and np.isfinite(value)
    )

    if request.variable == "temperature":
        frame["monthly_value"] = frame["source_value"]
        aggregation = (
            "The annual value is the day-weighted mean of NASA's 12 monthly means; "
            "values retain the source parameter's units."
        )
    else:
        frame["monthly_value"] = frame["source_value"]
        aggregation = (
            "The annual value is the day-weighted mean of NASA's 12 monthly corrected "
            "precipitation rates; values retain the source parameter's units."
        )
    monthly_units = dataset.source_units
    annual_units = dataset.source_units

    monthly_records = [
        SeriesPoint(
            period=str(period),
            value=float(value) if valid else None,
        )
        for period, value, valid in zip(
            frame["period"], frame["monthly_value"], frame["valid"], strict=True
        )
    ]

    annual_records: list[SeriesPoint] = []
    annual_years: list[int] = []
    annual_values: list[float] = []
    incomplete_years: list[int] = []
    for year, group in frame.groupby("year", sort=True):
        if not bool(group["valid"].all()):
            annual_records.append(SeriesPoint(period=str(year), value=None))
            incomplete_years.append(int(year))
            continue
        values = group["monthly_value"].to_numpy(dtype=float)
        annual_value = float(
            np.average(values, weights=group["days"].to_numpy(dtype=float))
        )
        annual_records.append(SeriesPoint(period=str(year), value=annual_value))
        annual_years.append(int(year))
        annual_values.append(annual_value)

    observed_periods = [
        str(period)
        for period, valid in zip(frame["period"], frame["valid"], strict=True)
        if valid
    ]
    return PreparedSeries(
        monthly=monthly_records,
        annual=annual_records,
        annual_years=annual_years,
        annual_values=annual_values,
        expected_months=len(expected_periods),
        missing_months=int((~frame["valid"]).sum()),
        incomplete_years=incomplete_years,
        first_observation=observed_periods[0] if observed_periods else None,
        last_observation=observed_periods[-1] if observed_periods else None,
        monthly_units=monthly_units,
        annual_units=annual_units,
        aggregation=aggregation,
    )
