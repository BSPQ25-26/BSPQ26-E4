import calendar
from core.database import supabase_admin as supabase


def get_expenses(user_id: str, category_id: int = None, month: int = None, year: int = None, start_date: str = None, end_date: str = None):
    query = (
        supabase.table("expenses")
        .select("*, categories(name, color, icon)")
        .eq("user_id", user_id)
    )
    if category_id:
        query = query.eq("category_id", category_id)
    if month and year:
        last_day = calendar.monthrange(year, month)[1]
        query = query.gte("expense_date", f"{year}-{month:02d}-01")
        query = query.lte("expense_date", f"{year}-{month:02d}-{last_day}")
    if start_date:
        query = query.gte("expense_date", start_date)
    if end_date:
        query = query.lte("expense_date", end_date)
    return query.order("expense_date", desc=True).execute().data


def create_expense(user_id: str, data: dict):
    data["user_id"] = user_id
    res = supabase.table("expenses").insert(data).execute()
    return res.data[0] if res.data else None


def update_expense(expense_id: int, user_id: str, data: dict):
    res = (
        supabase.table("expenses")
        .update(data)
        .eq("id", expense_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def delete_expense(expense_id: int, user_id: str):
    supabase.table("expenses").delete().eq("id", expense_id).eq("user_id", user_id).execute()


def get_expense_analytics(user_id: str, category_id: int = None, month: int = None, year: int = None):
    expenses = get_expenses(user_id, category_id, month, year)
    category_map = {}
    daily_map = {}

    for expense in expenses:
        amount = float(expense["amount"])
        expense_date = expense["expense_date"]
        category = expense.get("categories") or {}
        category_name = category.get("name") or "Uncategorized"

        if category_name not in category_map:
            category_map[category_name] = {
                "name": category_name,
                "value": 0.0,
                "icon": category.get("icon"),
                "color": category.get("color"),
            }
        category_map[category_name]["value"] += amount
        daily_map[expense_date] = daily_map.get(expense_date, 0.0) + amount

    category_breakdown = sorted(
        (
            {
                **item,
                "value": round(item["value"], 2),
            }
            for item in category_map.values()
        ),
        key=lambda item: item["value"],
        reverse=True,
    )

    daily_breakdown = [
        {
            "date": expense_date,
            "day": int(expense_date[-2:]),
            "amount": round(total, 2),
        }
        for expense_date, total in sorted(daily_map.items())
    ]

    return {
        "month_total": round(sum(float(expense["amount"]) for expense in expenses), 2),
        "category_breakdown": category_breakdown,
        "daily_breakdown": daily_breakdown,
    }
