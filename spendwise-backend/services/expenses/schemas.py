"""Pydantic schemas used by the expenses service.

The module groups together the input bodies (``ExpenseCreate``,
``ExpenseUpdate``) and the response models that describe the analytics
payload returned by ``GET /expenses/analytics``.
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel


class ExpenseCreate(BaseModel):
    """Payload accepted by ``POST /expenses``.

    Attributes:
        amount: Positive amount spent, in the user's currency.
        description: Free-text label shown next to the entry.
        category_id: Foreign key to ``categories``; ``None`` means uncategorised.
        expense_date: Date of the expense; defaults to today when omitted by the client.
        payment_method: Free-text payment method label; defaults to ``cash``.
    """

    amount: float
    description: Optional[str] = None
    category_id: Optional[int] = None
    expense_date: date = date.today()
    payment_method: Optional[str] = "cash"


class ExpenseUpdate(BaseModel):
    """Partial update payload for ``PUT /expenses/{expense_id}``.

    All fields are optional so the client can patch any subset of them.
    """

    amount: Optional[float] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    expense_date: Optional[date] = None
    payment_method: Optional[str] = None


class CategoryBreakdownItem(BaseModel):
    """Single entry of the analytics breakdown by category.

    Attributes:
        name: Category display name (or ``Uncategorized`` when missing).
        value: Total amount spent in that category for the period.
        icon: Optional icon identifier copied from the category row.
        color: Optional hex or RGB colour copied from the category row.
    """

    name: str
    value: float
    icon: Optional[str] = None
    color: Optional[str] = None


class DailyBreakdownItem(BaseModel):
    """Single entry of the analytics breakdown by day.

    Attributes:
        date: ISO date of the day.
        day: Day of the month, useful for the X axis of the chart.
        amount: Total amount spent on that day.
    """

    date: date
    day: int
    amount: float


class ExpenseAnalyticsResponse(BaseModel):
    """Full analytics payload returned by ``GET /expenses/analytics``.

    Attributes:
        month_total: Sum of the expenses included in the response.
        category_breakdown: Totals grouped by category, sorted by amount descending.
        daily_breakdown: Totals grouped by day, sorted by date ascending.
    """

    month_total: float
    category_breakdown: list[CategoryBreakdownItem]
    daily_breakdown: list[DailyBreakdownItem]
