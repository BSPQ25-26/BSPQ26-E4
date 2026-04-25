"""Database operations for the budgets service.

All queries are scoped to the authenticated user's ID, which the routes
have already validated.
"""

from core.database import supabase


def get_budgets(user_id: str, year: int = None, month: int = None):
    """Return the budgets owned by a user, optionally filtered.

    Args:
        user_id: Supabase user UUID, serialised as string.
        year: Optional year filter.
        month: Optional month filter (1-12).

    Returns:
        list[dict]: Matching budgets ordered from newest period to
        oldest. Each entry includes the joined
        ``categories(name, color, icon)`` column.
    """
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
    """Insert a new budget row owned by ``user_id``.

    Args:
        user_id: Supabase user UUID, serialised as string.
        data: Mapping with the budget fields. ``user_id`` is injected by
            this function.

    Returns:
        dict | None: The inserted row, or ``None`` if Supabase returned
        no data.
    """
    data["user_id"] = user_id
    res = supabase.table("budgets").insert(data).execute()
    return res.data[0] if res.data else None


def update_budget(budget_id: int, user_id: str, data: dict):
    """Patch a budget row, restricted to rows owned by ``user_id``.

    Args:
        budget_id: Numeric primary key.
        user_id: Supabase user UUID, serialised as string.
        data: Mapping with the fields to update.

    Returns:
        dict | None: The updated row, or ``None`` if the budget did not
        exist or did not belong to the user.
    """
    res = (
        supabase.table("budgets")
        .update(data)
        .eq("id", budget_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def delete_budget(budget_id: int, user_id: str):
    """Delete a budget owned by ``user_id``.

    Args:
        budget_id: Numeric primary key.
        user_id: Supabase user UUID, serialised as string.
    """
    supabase.table("budgets").delete().eq("id", budget_id).eq("user_id", user_id).execute()
