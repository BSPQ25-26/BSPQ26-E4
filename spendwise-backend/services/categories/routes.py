"""HTTP endpoints for the categories service."""

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from .crud import (
    category_has_dependencies,
    create_category,
    delete_category,
    get_categories,
    get_hidden_shared_categories,
    hide_shared_category,
    unhide_shared_category,
    update_category,
)
from .schemas import CategoryCreate, CategoryUpdate


router = APIRouter()


@router.get("/")
async def list_categories(current_user=Depends(get_current_user)):
    """Return the categories visible to the current user."""
    return get_categories(str(current_user.id))


@router.get("/hidden")
async def list_hidden_categories(current_user=Depends(get_current_user)):
    """Return the shared categories hidden by the current user."""
    return get_hidden_shared_categories(str(current_user.id))


@router.post("/", status_code=201)
async def create(
    body: CategoryCreate,
    current_user=Depends(get_current_user),
):
    """Create a category.

    Authentication is required so category management is restricted to
    signed-in users even though the current schema stores categories in
    a shared table.
    """
    result = create_category(str(current_user.id), body.model_dump())
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create category")
    return result


@router.put("/{category_id}")
async def update(
    category_id: int,
    body: CategoryUpdate,
    current_user=Depends(get_current_user),
):
    """Patch an existing category by id."""
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = update_category(category_id, str(current_user.id), data)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Category not found or not owned by the current user",
        )
    return result


@router.delete("/{category_id}", status_code=204)
async def delete(
    category_id: int,
    current_user=Depends(get_current_user),
):
    """Delete a user-owned category unless it is still used."""
    if category_has_dependencies(category_id):
        raise HTTPException(
            status_code=409,
            detail="Category is still in use by expenses or budgets",
        )
    delete_category(category_id, str(current_user.id))


@router.post("/{category_id}/hide", status_code=204)
async def hide(
    category_id: int,
    current_user=Depends(get_current_user),
):
    """Hide a shared category for the current user."""
    hidden = hide_shared_category(category_id, str(current_user.id))
    if not hidden:
        raise HTTPException(status_code=404, detail="Shared category not found")


@router.delete("/{category_id}/hide", status_code=204)
async def unhide(
    category_id: int,
    current_user=Depends(get_current_user),
):
    """Restore a previously hidden shared category for the current user."""
    unhide_shared_category(category_id, str(current_user.id))
