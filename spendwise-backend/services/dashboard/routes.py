"""HTTP endpoints for the dashboard service.

The dashboard exposes a single endpoint that returns the aggregated
monthly summary the frontend renders on its main screen.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from .crud import get_monthly_summary
from .schemas import DashboardSummaryResponse


router = APIRouter()


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_summary(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user=Depends(get_current_user),
):
    """Return the monthly spending summary for the authenticated user.

    When ``month`` or ``year`` are not provided, the current month and
    year are used. This makes the endpoint easy to call from the
    frontend without any parameters.

    Args:
        month: Optional target month (1-12). Defaults to the current
            month when omitted.
        year: Optional target year. Defaults to the current year when
            omitted.
        current_user: Injected authenticated user.

    Returns:
        DashboardSummaryResponse: Total spending and average daily
        spending for the requested month.
    """
    today = date.today()
    target_month = month if month else today.month
    target_year = year if year else today.year

    return get_monthly_summary(str(current_user.id), target_month, target_year)
