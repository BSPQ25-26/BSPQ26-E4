"""HTTP endpoints for the expenses service.

Mounted under ``/api/v1/expenses`` from :mod:`app.main`. Every endpoint
that returns or mutates user-owned data is guarded by the
:func:`app.dependencies.get_current_user` dependency.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user
from core.database import supabase
from .crud import (
    create_expense,
    delete_expense,
    get_expense_analytics,
    get_expenses,
    update_expense,
)
from .schemas import ExpenseAnalyticsResponse, ExpenseCreate, ExpenseUpdate


router = APIRouter()


@router.get("/health")
async def db_health():
    """Lightweight health check that pings Supabase.

    Performs a trivial ``SELECT id LIMIT 1`` against the ``expenses``
    table to confirm both that the service is running and that the
    database is reachable.

    Returns:
        dict: ``{"status": "OK", ...}`` on success or
        ``{"status": "ERROR", "error": ...}`` if the query fails.
    """
    try:
        supabase.table("expenses").select("id").limit(1).execute()
        return {
            "status": "OK",
            "supabase_connected": True,
            "message": "Expenses service + DB OK!",
        }
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}


@router.get("/analytics", response_model=ExpenseAnalyticsResponse)
async def expense_analytics(
    category_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    """Return aggregated analytics for the current user.

    Args:
        category_id: Optional category filter.
        month: Optional month (1-12), used together with ``year``.
        year: Optional year, used together with ``month``.
        start_date: Optional ISO start date (inclusive).
        end_date: Optional ISO end date (inclusive).
        current_user: Injected authenticated user.

    Returns:
        ExpenseAnalyticsResponse: Totals, category breakdown, and daily
        breakdown for the requested period.
    """
    return get_expense_analytics(
        str(current_user.id),
        category_id,
        month,
        year,
        start_date,
        end_date,
    )


@router.get("/")
async def list_expenses(
    category_id: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
):
    """List the authenticated user's expenses with optional filters.

    Args:
        category_id: Optional category filter.
        month: Optional month (1-12). Combine with ``year`` to filter by
            month.
        year: Optional year. Combine with ``month``.
        start_date: Optional ISO start date (inclusive).
        end_date: Optional ISO end date (inclusive).
        current_user: Injected authenticated user.

    Returns:
        list[dict]: Matching expense rows, newest first.
    """
    return get_expenses(
        str(current_user.id), category_id, month, year, start_date, end_date
    )


@router.post("/", status_code=201)
async def create(body: ExpenseCreate, current_user=Depends(get_current_user)):
    """Create a new expense for the authenticated user.

    The ``expense_date`` is converted to an ISO string before being sent
    to Supabase because the underlying client does not serialise
    :class:`datetime.date` values automatically.

    Args:
        body: New expense payload.
        current_user: Injected authenticated user.

    Returns:
        dict: The newly inserted expense row.

    Raises:
        HTTPException: 400 ``Failed to create expense`` if the database
            does not return any data.
    """
    data = body.model_dump()
    data["expense_date"] = str(data["expense_date"])
    result = create_expense(str(current_user.id), data)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create expense")
    return result


@router.put("/{expense_id}")
async def update(
    expense_id: int,
    body: ExpenseUpdate,
    current_user=Depends(get_current_user),
):
    """Patch an existing expense owned by the authenticated user.

    Only the fields explicitly set in the payload are forwarded to the
    database (``exclude_none=True``).

    Args:
        expense_id: Primary key of the expense to update.
        body: Partial update payload.
        current_user: Injected authenticated user.

    Returns:
        dict: The updated expense row.

    Raises:
        HTTPException: 404 ``Expense not found`` when the expense does
            not exist or does not belong to the caller.
    """
    data = body.model_dump(exclude_none=True)
    if "expense_date" in data:
        data["expense_date"] = str(data["expense_date"])
    result = update_expense(expense_id, str(current_user.id), data)
    if not result:
        raise HTTPException(status_code=404, detail="Expense not found")
    return result


@router.delete("/{expense_id}", status_code=204)
async def delete(expense_id: int, current_user=Depends(get_current_user)):
    """Delete an expense owned by the authenticated user.

    The endpoint always returns a 204, even if no row matched, because
    the operation is idempotent from the client's point of view.

    Args:
        expense_id: Primary key of the expense to delete.
        current_user: Injected authenticated user.
    """
    delete_expense(expense_id, str(current_user.id))
