from core.database import supabase


def get_budgets(user_id: str, year: int = None, month: int = None):
    query = (
        supabase.table("budgets")
        .select("*, categories(name, color, icon)")
        .eq("user_id", user_id)
    )
    if year:
        query = query.eq("year", year)
    if month:
        query = query.eq("month", month)
    return query.order("year", desc=True).order("month", desc=True).execute().data


def create_budget(user_id: str, data: dict):
    data["user_id"] = user_id
    res = supabase.table("budgets").insert(data).execute()
    return res.data[0] if res.data else None


def update_budget(budget_id: int, user_id: str, data: dict):
    res = (
        supabase.table("budgets")
        .update(data)
        .eq("id", budget_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def delete_budget(budget_id: int, user_id: str):
    supabase.table("budgets").delete().eq("id", budget_id).eq("user_id", user_id).execute()
