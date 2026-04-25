"""HTTP endpoints for the alerts service.

Alerts are produced server-side (typically by database triggers) when an
expense crosses the budget set for its category. This module exposes
only the read and dismiss operations; alerts are not created from HTTP.
"""

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from core.database import supabase


router = APIRouter()


@router.get("/")
async def list_alerts(current_user=Depends(get_current_user)):
    """Return the authenticated user's alerts, newest first.

    Each alert is returned together with its related budget and expense
    rows so the frontend can render context (which category and which
    specific spend triggered the alert) without follow-up requests.

    Args:
        current_user: Injected authenticated user.

    Returns:
        list[dict]: Alerts ordered by creation date (newest first).
    """
    res = (
        supabase.table("alerts")
        .select("*, budgets(amount, year, month), expenses(amount, description)")
        .eq("user_id", str(current_user.id))
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.delete("/{alert_id}", status_code=204)
async def dismiss_alert(alert_id: int, current_user=Depends(get_current_user)):
    """Dismiss an alert owned by the authenticated user.

    The double filter (``id`` + ``user_id``) prevents users from
    dismissing alerts that do not belong to them.

    Args:
        alert_id: Primary key of the alert to dismiss.
        current_user: Injected authenticated user.
    """
    supabase.table("alerts").delete().eq("id", alert_id).eq("user_id", str(current_user.id)).execute()
