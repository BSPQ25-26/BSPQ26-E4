"""Database operations for the dashboard service.

The dashboard intentionally aggregates server-side instead of pushing
the math to the client so the frontend can render the summary card with
a single round trip.
"""

import calendar
from datetime import date

from core.database import supabase_admin as supabase


def get_monthly_summary(user_id: str, month: int, year: int) -> dict:
    """Compute the monthly spending summary for a user.

    The function fetches every expense in the requested month and
    aggregates two figures: the total spent and the average daily cost.
    The denominator used for the average depends on whether the month
    is in the past, the current month, or in the future:

    * Current month: divide by the day of the month elapsed so far.
    * Past month: divide by the total number of days in that month.
    * Future month: division is skipped (the average becomes 0.0).

    Args:
        user_id: Supabase user UUID, serialised as string.
        month: Target month (1-12).
        year: Target year.

    Returns:
        dict: Payload matching :class:`schemas.DashboardSummaryResponse`.
    """
    # Compute the boundaries of the requested month so we can issue a
    # range query against ``expense_date``.
    last_day = calendar.monthrange(year, month)[1]
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{last_day}"

    query = (
        supabase.table("expenses")
        .select("amount")
        .eq("user_id", user_id)
        .gte("expense_date", start_date)
        .lte("expense_date", end_date)
    )

    res = query.execute()
    expenses = res.data if res.data else []

    total_spending = sum(float(exp["amount"]) for exp in expenses)

    # Choose the divisor used for the daily average based on whether
    # the requested month is the current one, in the past, or in the
    # future.
    today = date.today()
    if today.year == year and today.month == month:
        days_to_divide = today.day
    elif today.year > year or (today.year == year and today.month > month):
        days_to_divide = last_day
    else:
        # Future month: nothing has been spent yet, so the average
        # makes no sense. Falling back to 0.0 keeps the response shape
        # stable for the frontend.
        days_to_divide = 0

    average_daily_costs = (
        total_spending / days_to_divide if days_to_divide > 0 else 0.0
    )

    return {
        "total_monthly_spending": round(total_spending, 2),
        "average_daily_costs": round(average_daily_costs, 2),
        "month": month,
        "year": year,
    }
