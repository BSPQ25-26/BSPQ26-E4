"""Pydantic schemas used by the budgets service."""

from typing import Optional

from pydantic import BaseModel


class BudgetCreate(BaseModel):
    """Payload accepted by ``POST /budgets``.

    Attributes:
        category_id: Foreign key to ``categories``; ``None`` means an overall (any-category) budget.
        amount: Maximum amount the user wants to spend during the period.
        year: Four-digit year the budget applies to.
        month: Month the budget applies to (1-12).
    """

    category_id: Optional[int] = None
    amount: float
    year: int
    month: int


class BudgetUpdate(BaseModel):
    """Partial update payload for ``PUT /budgets/{budget_id}``.

    Only the cap and the category can be amended; the period (year and
    month) is intentionally fixed once the budget is created.
    """

    amount: Optional[float] = None
    category_id: Optional[int] = None
