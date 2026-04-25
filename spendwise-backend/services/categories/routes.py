"""HTTP endpoint for the categories service.

Categories are reference data shared across all users (e.g. "Food",
"Transport", ...). The single endpoint exposed here is therefore public:
it does not require authentication and does not filter by user.
"""

from fastapi import APIRouter

from core.database import supabase


router = APIRouter()


@router.get("/")
async def list_categories():
    """Return every category, sorted alphabetically by name.

    Returns:
        list[dict]: Category rows as stored in Supabase. Each row
        includes its ``id``, ``name``, ``color`` and ``icon``.
    """
    res = supabase.table("categories").select("*").order("name").execute()
    return res.data
