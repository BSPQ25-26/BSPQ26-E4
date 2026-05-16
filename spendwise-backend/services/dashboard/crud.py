"""Database operations for the dashboard service.

The dashboard intentionally aggregates server-side instead of pushing
the math to the client so the frontend can render the summary card with
a single round trip.
"""

import calendar
from datetime import date

from core.database import supabase_admin as supabase
from app.utils.currency import convert_currency


def get_monthly_summary(user_id: str, month: int, year: int) -> dict:
    """Compute the monthly spending summary for a user."""
    
    # 1. Obtenemos la moneda preferida del usuario
    try:
        user_profile = supabase.table("user_profiles").select("currency").eq("id", user_id).single().execute()
        base_currency = user_profile.data.get("currency", "EUR") if user_profile.data else "EUR"
    except Exception:
        base_currency = "EUR"

    last_day = calendar.monthrange(year, month)[1]
    start_date = f"{year}-{month:02d}-01"
    end_date = f"{year}-{month:02d}-{last_day}"

    # 2. Nos aseguramos de traernos también el campo "currency"
    query = (
        supabase.table("expenses")
        .select("amount, currency")
        .eq("user_id", user_id)
        .gte("expense_date", start_date)
        .lte("expense_date", end_date)
    )

    res = query.execute()
    expenses = res.data if res.data else []

    # 3. Sumamos convirtiendo cada gasto al vuelo
    total_spending = 0.0
    for exp in expenses:
        raw_amount = float(exp["amount"])
        exp_currency = exp.get("currency", "EUR")
        total_spending += convert_currency(raw_amount, exp_currency, base_currency)

    today = date.today()
    if today.year == year and today.month == month:
        days_to_divide = today.day
    elif today.year > year or (today.year == year and today.month > month):
        days_to_divide = last_day
    else:
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