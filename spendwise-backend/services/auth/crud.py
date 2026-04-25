"""Database operations for the auth service.

The auth flow leans on Supabase Auth for credential storage, password
hashing, and JWT issuance. This module wraps those calls and synchronises
the user profile in the ``user_profiles`` table.
"""

from core.database import supabase, supabase_admin


def register_user(email: str, password: str, full_name: str = None):
    """Register a new user and create their profile row.

    The function calls Supabase's sign-up flow (which handles password
    hashing) and, on success, inserts a matching record into
    ``user_profiles`` using the admin client to bypass RLS.

    Args:
        email: New user's email address.
        password: Plain-text password (hashed by Supabase server-side).
        full_name: Optional display name persisted on the profile.

    Returns:
        The raw Supabase response object. The caller can inspect
        ``response.user`` to obtain the freshly created user.
    """
    res = supabase.auth.sign_up({"email": email, "password": password})
    if res.user:
        profile_data = {"id": str(res.user.id), "email": email}
        if full_name:
            profile_data["full_name"] = full_name
        # Use the admin client because the user's session may not be
        # established yet at this point and RLS would block the insert.
        supabase_admin.table("user_profiles").insert(profile_data).execute()
    return res


def login_user(email: str, password: str):
    """Authenticate a user and return a Supabase session.

    Args:
        email: Registered email address.
        password: Plain-text password.

    Returns:
        Supabase response containing both the user and an access-token
        session.
    """
    return supabase.auth.sign_in_with_password({"email": email, "password": password})


def get_profile(user_id: str):
    """Fetch a user profile row by its primary key.

    Args:
        user_id: Supabase user UUID, serialised as string.

    Returns:
        dict | None: The profile dictionary, or ``None`` if no row
        exists for that user.
    """
    try:
        res = (
            supabase_admin.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return res.data
    except Exception:
        # ``single()`` raises when no row is found. Treat the missing
        # profile as a soft "no result" instead of a hard failure so the
        # caller can fall back to a minimal default representation.
        return None


def update_profile(user_id: str, data: dict):
    """Patch the user profile with the provided fields.

    Args:
        user_id: Supabase user UUID, serialised as string.
        data: Mapping with the fields to update.

    Returns:
        dict | None: The updated profile row, or ``None`` if no row was
        affected.
    """
    res = (
        supabase.table("user_profiles")
        .update(data)
        .eq("id", user_id)
        .execute()
    )
    return res.data[0] if res.data else None


def logout_user():
    """Invalidate the current Supabase session."""
    supabase.auth.sign_out()
