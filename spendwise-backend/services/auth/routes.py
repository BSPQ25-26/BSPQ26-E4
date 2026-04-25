"""HTTP endpoints for the auth service.

Exposes the standard account lifecycle (register, login, profile,
logout) under the ``/api/v1/auth`` prefix. Profile-related endpoints are
protected by the :func:`app.dependencies.get_current_user` dependency.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user
from .crud import (
    get_profile,
    login_user,
    logout_user,
    register_user,
    update_profile,
)
from .schemas import LoginRequest, ProfileUpdate, RegisterRequest


router = APIRouter()


@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    """Register a new user account.

    Args:
        body: Registration payload (email, password, optional name).

    Returns:
        dict: A confirmation message together with the new user's UUID.

    Raises:
        HTTPException: 400 with the underlying error message when
            Supabase rejects the sign-up (e.g. email already in use).
    """
    try:
        res = register_user(body.email, body.password, body.full_name)
        return {"message": "User registered", "user_id": str(res.user.id)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(body: LoginRequest):
    """Authenticate the user and return a Supabase access token.

    Args:
        body: Login payload (email and password).

    Returns:
        dict: Bearer access token plus basic user information consumed
        by the frontend (user ID and email).

    Raises:
        HTTPException: 401 ``Invalid credentials`` when Supabase rejects
            the credentials.
    """
    try:
        res = login_user(body.email, body.password)
        return {
            "access_token": res.session.access_token,
            "token_type": "bearer",
            "user_id": str(res.user.id),
            "email": res.user.email,
        }
    except Exception:
        # The exact failure reason is intentionally not surfaced to the
        # caller to avoid leaking which half of the credentials was wrong.
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    """Return the profile of the currently authenticated user.

    If the profile row is missing (e.g. the user was created outside the
    normal sign-up flow) a minimal stub built from the auth record is
    returned instead so the frontend can still render the user.

    Args:
        current_user: Injected by :func:`get_current_user`.

    Returns:
        dict: The full profile row, or a minimal ``{id, email}`` stub.
    """
    profile = get_profile(str(current_user.id))
    return profile or {"id": str(current_user.id), "email": current_user.email}


@router.put("/me")
async def update_me(
    body: ProfileUpdate,
    current_user=Depends(get_current_user),
):
    """Patch the authenticated user's profile.

    ``None`` fields are stripped before reaching the database so a
    client can send a partial payload without overwriting unrelated
    columns.

    Args:
        body: Patch payload with the fields to update.
        current_user: Injected by :func:`get_current_user`.

    Returns:
        dict: The updated profile row.

    Raises:
        HTTPException: 400 ``No fields to update`` when the payload
            contains no actual changes.
    """
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = update_profile(str(current_user.id), data)
    return result


@router.post("/logout")
async def logout(current_user=Depends(get_current_user)):
    """Invalidate the current Supabase session.

    Args:
        current_user: Injected by :func:`get_current_user`. Required so
            the endpoint cannot be hit anonymously.

    Returns:
        dict: A confirmation message.
    """
    logout_user()
    return {"message": "Logged out successfully"}
