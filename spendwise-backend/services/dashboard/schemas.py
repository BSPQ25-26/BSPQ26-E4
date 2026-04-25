"""Pydantic schemas used by the dashboard service."""

from pydantic import BaseModel


class DashboardSummaryResponse(BaseModel):
    """Aggregated summary returned by ``GET /dashboard/summary``.

    Attributes:
        total_monthly_spending: Sum of all expenses in the requested month, rounded to two decimals.
        average_daily_costs: Average daily spending; computed differently for past, current, and future months.
        month: Month the summary refers to (1-12).
        year: Four-digit year the summary refers to.
    """

    total_monthly_spending: float
    average_daily_costs: float
    month: int
    year: int
