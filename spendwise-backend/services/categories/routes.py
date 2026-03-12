from fastapi import APIRouter
from core.database import supabase

router = APIRouter()


@router.get("/")
async def list_categories():
    res = supabase.table("categories").select("*").order("name").execute()
    return res.data
