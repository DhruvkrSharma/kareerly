"""Pydantic schemas for Feed and Job entities."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FeedCard(BaseModel):
    """
    Mirrors the TypeScript FeedCard interface in lib/types.ts.
    This ensures frontend compatibility without any changes.
    """
    rec_id: int = 0
    job_id: int
    title: str
    company_name: str = "Company"
    company_logo: Optional[str] = None
    location: Optional[str] = None
    remote_ok: bool = False
    score: float = 0.5
    confidence: float = 0.3
    tier: int = Field(default=3, ge=1, le=4)
    score_factors: dict = Field(default_factory=dict)
    apply_url: Optional[str] = None


class FeedResponse(BaseModel):
    data: list[FeedCard]


class SwipeRequest(BaseModel):
    job_id: int
    rec_id: int = 0
    action: str = Field(..., pattern="^(apply|save|reject)$")
    session_id: Optional[str] = None


class SwipeResponse(BaseModel):
    success: bool


class SavedJob(BaseModel):
    rec_id: int
    job_id: int
    title: str = "Unknown Role"
    company_name: str = "Unknown Company"
    company_slug: str = ""
    company_logo: Optional[str] = None
    location: str = "India"
    remote_ok: bool = False
    score: int = 0
    confidence: float = 0.0
    tier: int = 3
    swipe_action: str
    swiped_at: Optional[str] = None
    apply_url: str = "#"
    skills: list[str] = Field(default_factory=list)


class SavedResponse(BaseModel):
    data: list[SavedJob]


class JobDetail(BaseModel):
    id: int
    company_id: int
    title: str
    description: Optional[str] = None
    requirements: list[str] = Field(default_factory=list)
    skills_required: list[str] = Field(default_factory=list)
    location: Optional[str] = None
    remote_ok: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    job_type: str = "fulltime"
    apply_url: Optional[str] = None
    is_active: bool = True
    scraped_at: Optional[str] = None
