"""Reusable FastAPI dependencies.

The most important one is :func:`get_current_user`, used by every route
that requires authentication. It validates the bearer token issued by
Supabase Auth and returns the matching user object.
"""

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.database import supabase


# Bearer-token security scheme. FastAPI uses this both at runtime
# (extracting the ``Authorization`` header) and to generate the OpenAPI
# schema with the right security requirement.
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Resolve the authenticated user from a Supabase bearer token.

    The dependency reads the ``Authorization: Bearer <token>`` header,
    asks Supabase Auth to validate the token, and returns the user object
    on success.

    Args:
        credentials: Bearer credentials extracted by FastAPI's
            :class:`HTTPBearer` security scheme.

    Returns:
        The Supabase user object whose JWT was provided.

    Raises:
        HTTPException: 401 ``Invalid or expired token`` when Supabase
            rejects the token or any error occurs while validating it.
    """
    token = credentials.credentials
    try:
        result = supabase.auth.get_user(token)
        return result.user
    except Exception:
        # Any failure path (expired token, invalid signature, network)
        # is reported to the client as a generic 401 to avoid leaking
        # information about why the validation failed.
        raise HTTPException(status_code=401, detail="Invalid or expired token")
