from fastapi import APIRouter, Depends
from core.database import supabase
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/")
async def list_alerts(current_user=Depends(get_current_user)):
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
    supabase.table("alerts").delete().eq("id", alert_id).eq("user_id", str(current_user.id)).execute()
