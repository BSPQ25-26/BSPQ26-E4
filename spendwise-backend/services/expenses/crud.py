"""Database operations and analytics for the expenses service.

These helpers always scope their queries to ``user_id`` so users can
only see their own expenses. The admin Supabase client is used
intentionally because the routes already enforce authentication and the
filters guarantee the data is owned by the caller.
"""

import calendar

from core.database import supabase_admin as supabase


def get_expenses(
    user_id: str,
    category_id: int = None,
    month: int = None,
    year: int = None,
    start_date: str = None,
    end_date: str = None,
):
    """Return the expenses owned by a user, optionally filtered.

    The filters are layered so combinations are supported (e.g. a
    specific category in a specific month). When both ``month`` and
    ``year`` are provided a date range covering that month is added.

    Args:
        user_id: Supabase user UUID, serialised as string.
        category_id: Optional category filter.
        month: Optional month (1-12). Applied together with ``year``.
        year: Optional year. Applied together with ``month``.
        start_date: Optional ISO start date (inclusive).
        end_date: Optional ISO end date (inclusive).

    Returns:
        list[dict]: Expenses for the user, sorted from newest to oldest.
        Each entry includes the joined ``categories(name, color, icon)``
        column for convenience.
    """
    query = (
        supabase.table("expenses")
        .select("*, categories(name, color, icon)")
        .eq("user_id", user_id)
    )
    if category_id:
        query = query.eq("category_id", category_id)
    if month and year:
        # Compute the last day of the month so February gets 28/29 days,
        # April gets 30, etc.
        last_day = calendar.monthrange(year, month)[1]
        query = query.gte("expense_date", f"{year}-{month:02d}-01")
        query = query.lte("expense_date", f"{year}-{month:02d}-{last_day}")
    if start_date:
        query = query.gte("expense_date", start_date)
    if end_date:
        query = query.lte("expense_date", end_date)
    return query.order("expense_date", desc=True).execute().data


def create_expense(user_id: str, data: dict):
    """Insert a new expense row owned by ``user_id``.

    Args:
        user_id: Supabase user UUID, serialised as string.
        data: Mapping with the expense fields. ``user_id`` is added by
            this function so callers do not need to inject it.

    Returns:
        dict | None: The inserted row, or ``None`` if Supabase did not
        return any data.
    """
    data["user_id"] = user_id
    res = supabase.table("expenses").insert(data).execute()
    return res.data[0] if res.data else None


def update_expense(expense_id: int, user_id: str, data: dict):
    """Patch an expense, restricted to rows owned by ``user_id``.

    The double filter (``id`` + ``user_id``) makes it impossible to
    update somebody else's expense even when calling through the admin
    client.

    Args:
        expense_id: Numeric primary key.
        user_id: Supabase user UUID, serialised as string.
        data: Mapping with the fields to update.

    Returns:
        dict | None: The updated row, or ``None`` if the expense did not
        exist or did not belong to the user.
    """
    res = (
        supabase.table("expenses")
        .update(data)
        .eq("id", expense_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def delete_expense(expense_id: int, user_id: str):
    """Delete an expense, restricted to rows owned by ``user_id``.

    Args:
        expense_id: Numeric primary key.
        user_id: Supabase user UUID, serialised as string.
    """
    supabase.table("expenses").delete().eq("id", expense_id).eq("user_id", user_id).execute()


def get_expense_analytics(
    user_id: str,
    category_id: int = None,
    month: int = None,
    year: int = None,
):
    """Compute aggregated analytics over the user's expenses.

    Two breakdowns are produced from the same in-memory pass:

    * ``category_breakdown``: sum per category, sorted by amount desc.
    * ``daily_breakdown``: sum per day, sorted by date asc.

    Args:
        user_id: Supabase user UUID, serialised as string.
        category_id: Optional category filter forwarded to
            :func:`get_expenses`.
        month: Optional month filter (1-12).
        year: Optional year filter.

    Returns:
        dict: A payload matching :class:`schemas.ExpenseAnalyticsResponse`.
    """
    expenses = get_expenses(user_id, category_id, month, year)
    category_map: dict[str, dict] = {}
    daily_map: dict[str, float] = {}

    # Single pass over the expenses building the two aggregation maps.
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

    # Categories: round the totals and sort highest spending first.
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

    # Daily breakdown: sorted ascending by date so the frontend can plot
    # it without further processing.
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
