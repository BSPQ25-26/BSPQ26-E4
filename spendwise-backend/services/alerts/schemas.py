from typing import Optional

from pydantic import BaseModel


class AlertStatusItem(BaseModel):
    """Status description for a user-defined monthly budget."""

    id: int
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    month: int
    year: int
    limit_amount: float
    spent_amount: float
    remaining_amount: float
    status: str
    is_over_limit: bool
