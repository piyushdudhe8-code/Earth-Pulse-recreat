from calendar import monthrange
from datetime import date

import numpy as np
from scipy.stats import linregress

from app.models.analysis import (
    HistoricalPeriodValue,
    ProbabilityDataUsed,
    ProbabilityRequest,
    ProbabilityResponse,
)
from app.services.data_provider import DataProvider
from app.services.statistics import (
    MINIMUM_COMPLETE_YEARS,
    calculate_trend,
)


BOOTSTRAP_ITERATIONS = 2_000
BOOTSTRAP_SEED = 20_261_115


class ProbabilityUnavailableError(Exception):
    def __init__(self, message: str, availability: dict[str, object]) -> None:
        super().__init__(message)
        self.availability = availability


def estimate_probability(
    request: ProbabilityRequest,
    provider: DataProvider,
) -> ProbabilityResponse:
    southern_summer = request.time_window == "next_summer" and request.lat < 0
    dataset = provider.fetch_monthly(
        latitude=request.lat,
        longitude=request.lon,
        variable=request.variable,
        start_year=request.start_year,
        end_year=request.end_year,
        complete_years=21 if southern_summer else 20,
    )

    target_year = (
        request.target_year
        if request.target_year is not None
        else _next_summer_year(request.lat, date.today())
    )
    target_months = _months_for_period(
        request.lat,
        request.time_window,
        target_year,
    )

    if request.start_year is None:
        selected_years = dataset.selected_years or ()
        years = list(selected_years[-20:])
        if southern_summer and selected_years:
            years = [year for year in years if year > selected_years[0]]
        if len(years) < 20:
            raise ProbabilityUnavailableError(
                (
                    f"NASA POWER returned only {len(years)} complete historical years "
                    "for this period; 20 are required."
                ),
                {
                    "complete_years": len(years),
                    "requested_complete_years": 20,
                    "source_url": dataset.source_url,
                },
            )
        start_year = years[0]
        end_year = years[-1]
    else:
        start_year = request.start_year
        end_year = request.end_year
        if start_year is None or end_year is None:
            raise ValueError("Both historical years are required when one is provided")
        years = list(range(start_year, end_year + 1))

    values: list[float] = []
    historical_values: list[HistoricalPeriodValue] = []
    incomplete_years: list[int] = []
    missing_periods = 0
    expected_periods = len(years)

    complete_years: list[int] = []
    for year in years:
        months = _months_for_period(
            request.lat,
            request.time_window,
            year,
        )
        value = _aggregate_period(dataset.observations, request.variable, months)
        if value is None:
            missing_periods += 1
            incomplete_years.append(year)
            continue
        complete_years.append(year)
        values.append(value)
        historical_values.append(HistoricalPeriodValue(year=year, value=value))

    availability: dict[str, object] = {
        "requested_start_year": start_year,
        "requested_end_year": end_year,
        "expected_periods": expected_periods,
        "complete_periods": len(complete_years),
        "missing_periods": missing_periods,
        "incomplete_years": incomplete_years,
        "minimum_periods_required": MINIMUM_COMPLETE_YEARS,
        "source": "NASA POWER",
    }
    if len(complete_years) < MINIMUM_COMPLETE_YEARS:
        raise ProbabilityUnavailableError(
            (
                f"NASA POWER returned {len(complete_years)} complete historical periods; "
                f"at least {MINIMUM_COMPLETE_YEARS} are required for an estimate."
            ),
            availability,
        )

    trend = calculate_trend(complete_years, values)
    probability, lower, upper = _bootstrap_probability(
        years=complete_years,
        values=values,
        target_year=target_year,
        threshold=request.threshold,
        condition=request.condition,
    )
    historical_events = sum(
        _meets_condition(value, request.threshold, request.condition) for value in values
    )
    historical_probability = 100 * historical_events / len(values)
    units = dataset.source_units
    metric_name = (
        "period-average temperature"
        if request.variable == "temperature"
        else "period-average corrected precipitation rate"
    )
    period_label = _period_label(request.time_window, request.lat, target_year)
    condition_text = "above" if request.condition == "above" else "below"
    method = (
        "A straight-line trend is fitted to the complete historical period values. "
        "The fitted trend is removed to get the historical residuals, then the line is "
        "extended to the target period and those residuals are added back. The chance is "
        "estimated from the residual values. For the 95% range, "
        f"{BOOTSTRAP_ITERATIONS:,} residual-bootstrap samples each refit the trend; a "
        "Jeffreys Beta model represents uncertainty in each sample's event rate. "
        "Half-count smoothing avoids presenting a false 0% or 100% estimate."
    )
    plain_language = (
        f"There is an estimated {probability:.0f}% chance that the {metric_name} will be "
        f"{condition_text} {request.threshold:g} {units} for {period_label}. The "
        f"bootstrap range is {lower:.0f}%–{upper:.0f}%. In the historical data, this "
        f"condition occurred in {historical_events} of {len(values)} available periods. "
        "This is a statistical estimate based on past NASA data, not an official climate forecast."
    )

    return ProbabilityResponse(
        latitude=request.lat,
        longitude=request.lon,
        variable=request.variable,
        condition=request.condition,
        threshold=request.threshold,
        units=units,
        time_window=period_label,
        target_year=target_year,
        target_months=[f"{year}-{month}" for year, month in target_months],
        probability_percent=probability,
        confidence_range_percent=(lower, upper),
        historical_events=historical_events,
        historical_periods=len(values),
        historical_probability_percent=historical_probability,
        method=method,
        data_used=ProbabilityDataUsed(
            dataset_name=dataset.dataset_name,
            dataset_version=dataset.version,
            source=dataset.source,
            data_type="reanalysis / model-derived",
            parameter_name=dataset.parameter_name,
            source_units=dataset.source_units,
            analysis_units=units,
            requested_start_year=start_year,
            requested_end_year=end_year,
            complete_periods=len(values),
            missing_periods=missing_periods,
            source_url=dataset.source_url,
            retrieved_at_utc=dataset.retrieved_at_utc,
            cache_status=dataset.cache_status,
            grid_cell_latitude=dataset.grid_cell_latitude,
            grid_cell_longitude=dataset.grid_cell_longitude,
            historical_values=historical_values,
            trend_direction=trend.direction,
            trend_significant=trend.significant,
            trend_rate_per_decade=trend.regression_slope_per_year * 10,
        ),
        assumptions=[
            "The fitted linear trend continues into the selected future period.",
            "Detrended historical variability is a useful guide to future year-to-year variability.",
            "Temperature and corrected precipitation are day-weighted averages over the selected months, in NASA POWER's original parameter units.",
            "A summer uses June–August north of the equator, December–February south of the equator, and June–August as an equatorial convention.",
        ],
        limitations=[
            "This is not an official climate forecast and does not guarantee what will happen.",
            "The point query represents the nearest NASA grid cell, not a measurement at the exact location.",
            "The estimate uses a short historical record and a simple linear trend; uncertainty can be large, especially farther into the future.",
            "Monthly data cannot estimate the chance of a particular hot day, daily extreme, or storm.",
            "The bootstrap range describes uncertainty from resampling this record; it does not include every climate-model or future-emissions uncertainty.",
            "The historical comparison uses only complete periods; missing periods are excluded.",
        ],
        plain_language=plain_language,
    )


def _next_summer_year(latitude: float, today: date) -> int:
    if latitude < 0:
        return today.year if today.month <= 2 else today.year + 1
    return today.year if today.month < 6 else today.year + 1


def _months_for_period(
    latitude: float,
    time_window: str,
    year: int,
) -> list[tuple[int, str]]:
    if time_window == "year":
        return [(year, f"{month:02d}") for month in range(1, 13)]
    if latitude < 0:
        return [(year - 1, "12"), (year, "01"), (year, "02")]
    return [(year, "06"), (year, "07"), (year, "08")]


def _aggregate_period(
    observations: dict[str, float | None],
    variable: str,
    year_months: list[tuple[int, str]],
) -> float | None:
    values: list[float] = []
    days: list[int] = []
    for year, month_text in year_months:
        value = observations.get(f"{year}{month_text}")
        if value is None:
            return None
        month = int(month_text)
        values.append(value)
        days.append(monthrange(year, month)[1])

    return float(np.average(values, weights=days))


def _meets_condition(value: float, threshold: float, condition: str) -> bool:
    return value > threshold if condition == "above" else value < threshold


def _bootstrap_probability(
    years: list[int],
    values: list[float],
    target_year: int,
    threshold: float,
    condition: str,
) -> tuple[float, float, float]:
    year_values = np.asarray(years, dtype=float)
    climate_values = np.asarray(values, dtype=float)
    sample_count = len(climate_values)
    regression = linregress(year_values, climate_values)
    fitted = regression.intercept + regression.slope * year_values
    residuals = climate_values - fitted
    target_estimate = float(regression.intercept + regression.slope * target_year)

    historical_events = sum(
        _meets_condition(float(target_estimate + residual), threshold, condition)
        for residual in residuals
    )
    probability = 100 * (historical_events + 0.5) / (sample_count + 1)

    random = np.random.default_rng(BOOTSTRAP_SEED)
    sampled_residuals = residuals[
        random.integers(0, sample_count, size=(BOOTSTRAP_ITERATIONS, sample_count))
    ]
    bootstrap_values = fitted[np.newaxis, :] + sampled_residuals
    centered_years = year_values - year_values.mean()
    year_sum_squares = float(np.sum(centered_years**2))
    bootstrap_means = bootstrap_values.mean(axis=1)
    bootstrap_slopes = np.sum(
        (bootstrap_values - bootstrap_means[:, np.newaxis]) * centered_years,
        axis=1,
    ) / year_sum_squares
    bootstrap_intercepts = bootstrap_means - bootstrap_slopes * year_values.mean()
    bootstrap_residuals = bootstrap_values - (
        bootstrap_intercepts[:, np.newaxis]
        + bootstrap_slopes[:, np.newaxis] * year_values
    )
    future_values = (
        bootstrap_intercepts[:, np.newaxis]
        + bootstrap_slopes[:, np.newaxis] * target_year
        + bootstrap_residuals
    )
    if condition == "above":
        event_counts = np.sum(future_values > threshold, axis=1)
    else:
        event_counts = np.sum(future_values < threshold, axis=1)
    posterior_probabilities = random.beta(
        event_counts + 0.5,
        sample_count - event_counts + 0.5,
    ) * 100
    lower, upper = np.quantile(posterior_probabilities, [0.025, 0.975])
    lower = max(0.5, min(float(lower), probability))
    upper = min(99.5, max(float(upper), probability))
    return (
        float(probability),
        lower,
        upper,
    )


def _period_label(time_window: str, latitude: float, year: int) -> str:
    if time_window == "year":
        return f"calendar year {year}"
    if latitude < 0:
        return f"southern-hemisphere summer (Dec–Feb {year})"
    if latitude == 0:
        return f"equatorial summer convention (Jun–Aug {year})"
    return f"summer (Jun–Aug {year})"
