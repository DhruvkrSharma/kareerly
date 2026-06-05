"""Pydantic schemas for User/Profile entities."""

from pydantic import BaseModel
from typing import Optional


class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    skills: list[str] = []
    preferred_roles: list[str] = []
    experience_years: int = 0
    resume_text: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    role: str = "authenticated"
