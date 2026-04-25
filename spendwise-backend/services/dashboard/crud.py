import calendar
from datetime import date
from core.database import supabase_admin as supabase

def get_monthly_summary(user_id: str, month: int, year: int):
    # Fetch expenses for the given month
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

    # Calculate days passed in month limit by the total days in month
    today = date.today()
    if today.year == year and today.month == month:
        days_to_divide = today.day
    elif today.year > year or (today.year == year and today.month > month):
        days_to_divide = last_day
    else:
        # Future month
        days_to_divide = 0

    average_daily_costs = total_spending / days_to_divide if days_to_divide > 0 else 0.0

    return {
        "total_monthly_spending": round(total_spending, 2),
        "average_daily_costs": round(average_daily_costs, 2),
        "month": month,
        "year": year
    }
