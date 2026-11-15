import pytest

from app.services.statistics import (
    InsufficientDataError,
    calculate_trend,
)


def test_increasing_series_reports_known_annual_slopes() -> None:
    years = [2000, 2001, 2003, 2004, 2006, 2008, 2009, 2011, 2012, 2015]
    values = [5.0 + 1.75 * (year - years[0]) for year in years]

    result = calculate_trend(years, values)

    assert result.direction == "increasing"
    assert result.significant is True
    assert result.mann_kendall_p_value < 0.05
    assert result.sen_slope_per_year == pytest.approx(1.75)
    assert result.regression_slope_per_year == pytest.approx(1.75)
    assert result.regression_ci_lower == pytest.approx(1.75)
    assert result.regression_ci_upper == pytest.approx(1.75)


def test_decreasing_series_reports_decreasing_direction() -> None:
    years = list(range(2000, 2012))
    values = [30.0 - 0.8 * (year - years[0]) for year in years]

    result = calculate_trend(years, values)

    assert result.direction == "decreasing"
    assert result.significant is True
    assert result.sen_slope_per_year == pytest.approx(-0.8)
    assert result.regression_slope_per_year == pytest.approx(-0.8)


def test_constant_series_has_no_clear_trend() -> None:
    years = list(range(2000, 2012))
    values = [12.0] * len(years)

    result = calculate_trend(years, values)

    assert result.direction == "no clear trend"
    assert result.significant is False
    assert result.mann_kendall_p_value == pytest.approx(1.0)
    assert result.sen_slope_per_year == pytest.approx(0.0)
    assert result.regression_slope_per_year == pytest.approx(0.0)


def test_rejects_too_few_annual_values() -> None:
    with pytest.raises(InsufficientDataError, match="At least 10 complete annual values"):
        calculate_trend(list(range(2000, 2009)), [float(year) for year in range(9)])


def test_rejects_non_finite_values() -> None:
    years = list(range(2000, 2010))
    values = [float(year) for year in years]
    values[4] = float("nan")

    with pytest.raises(ValueError, match="finite annual values"):
        calculate_trend(years, values)
