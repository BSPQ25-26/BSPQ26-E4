from pydantic import BaseModel
from typing import Optional
from datetime import date


class ExpenseCreate(BaseModel):
    amount: float
    description: Optional[str] = None
    category_id: Optional[int] = None
    expense_date: date = date.today()
    payment_method: Optional[str] = "cash"


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    expense_date: Optional[date] = None
    payment_method: Optional[str] = None


class CategoryBreakdownItem(BaseModel):
    name: str
    value: float
    icon: Optional[str] = None
    color: Optional[str] = None


class DailyBreakdownItem(BaseModel):
    date: date
    day: int
    amount: float


class ExpenseAnalyticsResponse(BaseModel):
    month_total: float
    category_breakdown: list[CategoryBreakdownItem]
    daily_breakdown: list[DailyBreakdownItem]
