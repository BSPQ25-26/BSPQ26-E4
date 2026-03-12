from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from core.database import supabase
from app.dependencies import get_current_user
from .schemas import ExpenseCreate, ExpenseUpdate
from .crud import get_expenses, create_expense, update_expense, delete_expense

router = APIRouter()


@router.get("/health")
async def db_health():
    """Health check con Supabase"""
    try:
        supabase.table("expenses").select("id").limit(1).execute()
        return {"status": "OK", "supabase_connected": True, "message": "Expenses service + DB OK!"}
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}


@router.get("/")
async def list_expenses(
    category_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    current_user=Depends(get_current_user),
):
    return get_expenses(str(current_user.id), category_id, month, year)


@router.post("/", status_code=201)
async def create(body: ExpenseCreate, current_user=Depends(get_current_user)):
    data = body.model_dump()
    data["expense_date"] = str(data["expense_date"])
    result = create_expense(str(current_user.id), data)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create expense")
    return result


@router.put("/{expense_id}")
async def update(expense_id: int, body: ExpenseUpdate, current_user=Depends(get_current_user)):
    data = body.model_dump(exclude_none=True)
    if "expense_date" in data:
        data["expense_date"] = str(data["expense_date"])
    result = update_expense(expense_id, str(current_user.id), data)
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found")
    return result


@router.delete("/{expense_id}", status_code=204)
async def delete(expense_id: int, current_user=Depends(get_current_user)):
    delete_expense(expense_id, str(current_user.id))
