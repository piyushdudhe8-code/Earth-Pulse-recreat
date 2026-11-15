from dataclasses import dataclass
from typing import Sequence

import numpy as np
import pymannkendall as mk
from scipy.stats import linregress, t, theilslopes


MINIMUM_COMPLETE_YEARS = 10
SIGNIFICANCE_LEVEL = 0.05


class InsufficientDataError(ValueError):
    pass


@dataclass(frozen=True)
class TrendStatistics:
    direction: str
    mann_kendall_p_value: float
    sen_slope_per_year: float
    regression_slope_per_year: float
    regression_intercept: float
    regression_p_value: float
    regression_ci_lower: float
    regression_ci_upper: float
    r_squared: float
    significant: bool
    regression_band: dict[int, tuple[float, float, float]]


def calculate_trend(years: Sequence[int], values: Sequence[float]) -> TrendStatistics:
    year_array = np.asarray(years, dtype=float)
    value_array = np.asarray(values, dtype=float)
    if year_array.ndim != 1 or value_array.ndim != 1 or len(year_array) != len(value_array):
        raise ValueError("years and values must be one-dimensional arrays of equal length")
    if len(value_array) < MINIMUM_COMPLETE_YEARS:
        raise InsufficientDataError(
            f"At least {MINIMUM_COMPLETE_YEARS} complete annual values are required; "
            f"received {len(value_array)}"
        )
    if not np.all(np.isfinite(year_array)) or not np.all(np.isfinite(value_array)):
        raise ValueError("Trend calculations require finite annual values")
    if np.any(np.diff(year_array) <= 0):
        raise ValueError("years must be strictly increasing")

    mann_kendall = mk.original_test(value_array)
    regression = linregress(year_array, value_array)
    critical_t = float(t.ppf(0.975, df=len(value_array) - 2))
    margin = critical_t * regression.stderr
    sen = theilslopes(value_array, x=year_array)
    residuals = value_array - (regression.intercept + regression.slope * year_array)
    residual_standard_error = float(np.sqrt(np.sum(residuals**2) / (len(value_array) - 2)))
    mean_year = float(np.mean(year_array))
    squared_year_deviation = float(np.sum((year_array - mean_year) ** 2))
    regression_band: dict[int, tuple[float, float, float]] = {}
    for year in years:
        prediction = float(regression.intercept + regression.slope * year)
        prediction_error = residual_standard_error * float(
            np.sqrt(1 / len(value_array) + (year - mean_year) ** 2 / squared_year_deviation)
        )
        band_margin = critical_t * prediction_error
        regression_band[int(year)] = (
            prediction,
            prediction - band_margin,
            prediction + band_margin,
        )

    if mann_kendall.trend == "increasing":
        direction = "increasing"
    elif mann_kendall.trend == "decreasing":
        direction = "decreasing"
    else:
        direction = "no clear trend"

    return TrendStatistics(
        direction=direction,
        mann_kendall_p_value=float(mann_kendall.p),
        sen_slope_per_year=float(sen.slope),
        regression_slope_per_year=float(regression.slope),
        regression_intercept=float(regression.intercept),
        regression_p_value=float(regression.pvalue),
        regression_ci_lower=float(regression.slope - margin),
        regression_ci_upper=float(regression.slope + margin),
        r_squared=float(regression.rvalue**2),
        significant=bool(mann_kendall.p < SIGNIFICANCE_LEVEL),
        regression_band=regression_band,
    )
