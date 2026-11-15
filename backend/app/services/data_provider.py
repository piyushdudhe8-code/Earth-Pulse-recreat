from dataclasses import dataclass
from typing import Literal, Protocol


@dataclass(frozen=True)
class MonthlyDataset:
    observations: dict[str, float | None]
    dataset_name: str
    version: str
    source: str
    source_units: str
    parameter_name: str
    source_url: str
    retrieved_at_utc: str
    cache_status: Literal["live", "cached"]
    grid_cell_latitude: float
    grid_cell_longitude: float
    selected_years: tuple[int, ...] | None = None


class DataProvider(Protocol):
    def fetch_monthly(
        self,
        latitude: float,
        longitude: float,
        variable: str,
        start_year: int | None,
        end_year: int | None,
        complete_years: int = 20,
    ) -> MonthlyDataset:
        """Return source observations keyed by YYYYMM, retaining source units."""
