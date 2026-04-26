"""Database helpers for category management."""

from core.database import supabase_admin


def _get_hidden_category_ids(user_id: str) -> set[int]:
    """Return the ids of shared categories hidden by the user."""
    rows = (
        supabase_admin.table("user_hidden_categories")
        .select("category_id")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    return {row["category_id"] for row in rows}


def get_categories(user_id: str):
    """Return visible global categories plus the current user's categories."""
    hidden_ids = _get_hidden_category_ids(user_id)
    global_categories = (
        supabase_admin.table("categories")
        .select("*")
        .is_("user_id", "null")
        .order("name")
        .execute()
        .data
    )
    user_categories = (
        supabase_admin.table("categories")
        .select("*")
        .eq("user_id", user_id)
        .order("name")
        .execute()
        .data
    )
    visible_global_categories = [
        category for category in global_categories if category["id"] not in hidden_ids
    ]
    return sorted(
        [*visible_global_categories, *user_categories],
        key=lambda item: item["name"].lower(),
    )


def get_hidden_shared_categories(user_id: str):
    """Return the shared categories explicitly hidden by the user."""
    hidden_ids = _get_hidden_category_ids(user_id)
    if not hidden_ids:
        return []

    global_categories = (
        supabase_admin.table("categories")
        .select("*")
        .is_("user_id", "null")
        .order("name")
        .execute()
        .data
    )
    return [category for category in global_categories if category["id"] in hidden_ids]


def create_category(user_id: str, data: dict):
    """Insert a user-owned category and return the inserted row when available."""
    payload = {**data, "user_id": user_id}
    res = supabase_admin.table("categories").insert(payload).execute()
    return res.data[0] if res.data else None


def update_category(category_id: int, user_id: str, data: dict):
    """Patch a user-owned category by id and return the updated row."""
    res = (
        supabase_admin.table("categories")
        .update(data)
        .eq("id", category_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def category_has_dependencies(category_id: int) -> bool:
    """Return whether a category is referenced by expenses or budgets."""
    expenses = (
        supabase_admin.table("expenses")
        .select("id")
        .eq("category_id", category_id)
        .limit(1)
        .execute()
    )
    if expenses.data:
        return True

    budgets = (
        supabase_admin.table("budgets")
        .select("id")
        .eq("category_id", category_id)
        .limit(1)
        .execute()
    )
    return bool(budgets.data)


def delete_category(category_id: int, user_id: str):
    """Delete a user-owned category by id."""
    (
        supabase_admin.table("categories")
        .delete()
        .eq("id", category_id)
        .eq("user_id", user_id)
        .execute()
    )


def hide_shared_category(category_id: int, user_id: str) -> bool:
    """Hide a shared category for the user.

    Returns ``False`` when the target category does not exist as a
    shared category.
    """
    category = (
        supabase_admin.table("categories")
        .select("id")
        .eq("id", category_id)
        .is_("user_id", "null")
        .limit(1)
        .execute()
    )
    if not category.data:
        return False

    existing = (
        supabase_admin.table("user_hidden_categories")
        .select("id")
        .eq("user_id", user_id)
        .eq("category_id", category_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return True

    supabase_admin.table("user_hidden_categories").insert(
        {"user_id": user_id, "category_id": category_id}
    ).execute()
    return True


def unhide_shared_category(category_id: int, user_id: str):
    """Unhide a shared category for the user."""
    (
        supabase_admin.table("user_hidden_categories")
        .delete()
        .eq("user_id", user_id)
        .eq("category_id", category_id)
        .execute()
    )
