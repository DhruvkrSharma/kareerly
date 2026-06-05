"""Pydantic schemas for AI Matching entities."""

from pydantic import BaseModel, Field
from typing import Optional


class MatchScoreRequest(BaseModel):
    job_id: int
    user_id: Optional[str] = None  # Optional, defaults to current user


class ScoreFactors(BaseModel):
    skills_overlap: float = Field(default=0.0, ge=0.0, le=1.0)
    experience_fit: float = Field(default=0.0, ge=0.0, le=1.0)
    domain_match: float = Field(default=0.0, ge=0.0, le=1.0)
    requirements_match: float = Field(default=0.0, ge=0.0, le=1.0)
    why_matched: list[str] = Field(default_factory=list)
    resume_gaps: list[str] = Field(default_factory=list)


class MatchScoreResponse(BaseModel):
    score: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    tier: int = Field(ge=1, le=4)
    score_factors: ScoreFactors
