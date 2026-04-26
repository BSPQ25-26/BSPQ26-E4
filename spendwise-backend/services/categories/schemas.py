"""Pydantic schemas for category management."""

from typing import Optional

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    """Payload accepted by ``POST /categories``."""

    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=255)
    color: Optional[str] = Field(default=None, max_length=32)
    icon: Optional[str] = Field(default=None, max_length=16)


class CategoryUpdate(BaseModel):
    """Partial payload accepted by ``PUT /categories/{category_id}``."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=255)
    color: Optional[str] = Field(default=None, max_length=32)
    icon: Optional[str] = Field(default=None, max_length=16)
