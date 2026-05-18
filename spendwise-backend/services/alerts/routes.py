"""HTTP endpoints for the alerts service.

Alerts are produced server-side (typically by database triggers) when an
expense crosses the budget set for its category. This module exposes
only the read and dismiss operations; alerts are not created from HTTP.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user
from core.database import supabase
from .crud import get_alert_statuses
from .schemas import AlertStatusItem


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


@router.get("/statuses", response_model=list[AlertStatusItem])
async def list_alert_statuses(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user=Depends(get_current_user),
):
    """Return the current user's budget alert statuses for a target month.

    The service compares the user's real spending against the monthly
    budget limits defined in ``budgets`` and returns a list of status
    objects. If no month/year is provided, the current period is used.
    """
    today = date.today()
    target_month = month if month else today.month
    target_year = year if year else today.year
    return get_alert_statuses(str(current_user.id), target_month, target_year)


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
