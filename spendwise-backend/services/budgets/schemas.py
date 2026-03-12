from pydantic import BaseModel
from typing import Optional


class BudgetCreate(BaseModel):
    category_id: Optional[int] = None
    amount: float
    year: int
    month: int


class BudgetUpdate(BaseModel):
    amount: Optional[float] = None
    category_id: Optional[int] = None
