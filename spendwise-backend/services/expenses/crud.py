import calendar
from core.database import supabase


def get_expenses(user_id: str, category_id: int = None, month: int = None, year: int = None):
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
