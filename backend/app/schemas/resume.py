"""Pydantic schemas for Resume entities."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ResumeTailorRequest(BaseModel):
    job_id: int


class ResumeTailorResponse(BaseModel):
    data: str  # Markdown content


class ResumeHistoryItem(BaseModel):
    id: str
    job_id: int
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    content: str
    created_at: Optional[str] = None


class ResumeHistoryResponse(BaseModel):
    data: list[ResumeHistoryItem]
