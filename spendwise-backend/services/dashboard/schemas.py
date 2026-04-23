from pydantic import BaseModel

class DashboardSummaryResponse(BaseModel):
    total_monthly_spending: float
    average_daily_costs: float
    month: int
    year: int
