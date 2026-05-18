from datetime import date
from typing import Optional

from core.database import supabase
from services.expenses.crud import get_expenses


def get_alert_statuses(user_id: str, month: Optional[int] = None, year: Optional[int] = None):
    """Compare the user's budget limits against actual spending.

    The service returns a status object for each monthly budget owned by the
    authenticated user. Statuses are computed from expenses in the same year
    and month as the budget.

    Args:
        user_id: Supabase user UUID, serialised as string.
        month: Optional month filter (1-12). Defaults to the current month.
        year: Optional year filter. Defaults to the current year.

    Returns:
        list[dict]: Budget statuses with spent totals and alert flags.
    """
    today = date.today()
    target_month = month if month else today.month
    target_year = year if year else today.year

    budgets = (
        supabase.table("budgets")
        .select("*, categories(name, color, icon)")
        .eq("user_id", user_id)
        .eq("year", target_year)
        .eq("month", target_month)
        .execute()
    ).data or []

    expenses = get_expenses(user_id, month=target_month, year=target_year)

    category_totals: dict[Optional[int], float] = {}
    total_spent = 0.0
    for expense in expenses:
        amount = float(expense["amount"])
        total_spent += amount
        category_id = expense.get("category_id")
        category_totals[category_id] = category_totals.get(category_id, 0.0) + amount

    statuses = []
    for budget in budgets:
        limit_amount = float(budget["amount"])
        budget_category_id = budget.get("category_id")
        spent_amount = round(
            total_spent if budget_category_id is None else category_totals.get(budget_category_id, 0.0),
            2,
        )
        remaining_amount = round(limit_amount - spent_amount, 2)
        status = "exceeded" if spent_amount > limit_amount else "ok"
        categories = budget.get("categories") or {}

        statuses.append(
            {
                "id": budget["id"],
                "category_id": budget_category_id,
                "category_name": categories.get("name"),
                "category_icon": categories.get("icon"),
                "category_color": categories.get("color"),
                "month": budget["month"],
                "year": budget["year"],
                "limit_amount": limit_amount,
                "spent_amount": spent_amount,
                "remaining_amount": remaining_amount,
                "status": status,
                "is_over_limit": spent_amount > limit_amount,
            }
        )

    return statuses
