"""HTTP endpoints for the budgets service.

Mounted under ``/api/v1/budgets`` from :mod:`app.main`. Every endpoint
requires authentication.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user
from .crud import create_budget, delete_budget, get_budgets, update_budget
from .schemas import BudgetCreate, BudgetUpdate


router = APIRouter()


@router.get("/")
async def list_budgets(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user=Depends(get_current_user),
):
    """List the authenticated user's budgets with optional filters.

    Args:
        year: Optional year filter.
        month: Optional month filter (1-12).
        current_user: Injected authenticated user.

    Returns:
        list[dict]: Matching budgets, most recent period first.
    """
    return get_budgets(str(current_user.id), year, month)


@router.post("/", status_code=201)
async def create(body: BudgetCreate, current_user=Depends(get_current_user)):
    """Create a new budget for the authenticated user.

    Args:
        body: New budget payload.
        current_user: Injected authenticated user.

    Returns:
        dict: The newly inserted budget row.

    Raises:
        HTTPException: 400 ``Failed to create budget`` if the database
            returns no data.
    """
    result = create_budget(str(current_user.id), body.model_dump())
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create budget")
    return result


@router.put("/{budget_id}")
async def update(
    budget_id: int,
    body: BudgetUpdate,
    current_user=Depends(get_current_user),
):
    """Patch a budget owned by the authenticated user.

    Only the fields explicitly set in the payload are sent to the
    database (``exclude_none=True``).

    Args:
        budget_id: Primary key of the budget to update.
        body: Partial update payload.
        current_user: Injected authenticated user.

    Returns:
        dict: The updated budget row.

    Raises:
        HTTPException: 400 ``No fields to update`` if the payload has
            no actual changes; 404 ``Budget not found`` if the budget
            does not exist or does not belong to the caller.
    """
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = update_budget(budget_id, str(current_user.id), data)
    if not result:
        raise HTTPException(status_code=404, detail="Budget not found")
    return result


@router.delete("/{budget_id}", status_code=204)
async def delete(budget_id: int, current_user=Depends(get_current_user)):
    """Delete a budget owned by the authenticated user.

    The endpoint always returns a 204 because the operation is
    idempotent from the client's perspective.

    Args:
        budget_id: Primary key of the budget to delete.
        current_user: Injected authenticated user.
    """
    delete_budget(budget_id, str(current_user.id))
