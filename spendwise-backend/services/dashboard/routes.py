from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import date
from app.dependencies import get_current_user
from .schemas import DashboardSummaryResponse
from .crud import get_monthly_summary

router = APIRouter()

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_summary(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user=Depends(get_current_user)
):
    today = date.today()
    target_month = month if month else today.month
    target_year = year if year else today.year

    summary = get_monthly_summary(str(current_user.id), target_month, target_year)
    return summary
