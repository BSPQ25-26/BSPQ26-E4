from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.dependencies import get_current_user
from .schemas import BudgetCreate, BudgetUpdate
from .crud import get_budgets, create_budget, update_budget, delete_budget

router = APIRouter()


@router.get("/")
async def list_budgets(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user=Depends(get_current_user),
):
    return get_budgets(str(current_user.id), year, month)


@router.post("/", status_code=201)
async def create(body: BudgetCreate, current_user=Depends(get_current_user)):
    result = create_budget(str(current_user.id), body.model_dump())
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create budget")
    return result


@router.put("/{budget_id}")
async def update(budget_id: int, body: BudgetUpdate, current_user=Depends(get_current_user)):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = update_budget(budget_id, str(current_user.id), data)
    if not result:
        raise HTTPException(status_code=404, detail="Budget not found")
    return result


@router.delete("/{budget_id}", status_code=204)
async def delete(budget_id: int, current_user=Depends(get_current_user)):
    delete_budget(budget_id, str(current_user.id))
