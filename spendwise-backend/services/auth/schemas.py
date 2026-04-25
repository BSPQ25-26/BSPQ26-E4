"""Pydantic schemas used by the auth service.

These models validate the JSON bodies of the auth endpoints and double
as documentation in the auto-generated OpenAPI schema.
"""

from typing import Optional

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    """Payload accepted by ``POST /auth/register``.

    Attributes:
        email: User's email address (validated as a real email).
        password: Plain-text password; hashing is delegated to Supabase Auth.
        full_name: Optional display name stored on the user profile.
    """

    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    """Payload accepted by ``POST /auth/login``.

    Attributes:
        email: Registered email address.
        password: Plain-text password.
    """

    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    """Partial update for the user profile (``PUT /auth/me``).

    Every field is optional so the client may patch any subset of them.
    Fields that are ``None`` are filtered out before reaching the database.

    Attributes:
        full_name: Display name shown across the application.
        currency: Preferred currency code (for example ``EUR`` or ``USD``).
        monthly_income: Self-reported monthly income used as a baseline for budget hints.
    """

    full_name: Optional[str] = None
    currency: Optional[str] = None
    monthly_income: Optional[float] = None
