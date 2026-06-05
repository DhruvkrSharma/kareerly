"""Pydantic schemas for Interview Copilot."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class QuestionType(str, Enum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    HR = "hr"
    SYSTEM_DESIGN = "system_design"
    CODING = "coding"


class InterviewGenerateRequest(BaseModel):
    job_id: int
    question_types: list[QuestionType] = Field(
        default=[QuestionType.TECHNICAL, QuestionType.BEHAVIORAL, QuestionType.HR]
    )
    num_questions: int = Field(default=5, ge=1, le=15)


class InterviewQuestion(BaseModel):
    type: QuestionType
    question: str
    expected_answer: str
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    tips: list[str] = Field(default_factory=list)


class InterviewGenerateResponse(BaseModel):
    job_title: str
    company_name: str
    questions: list[InterviewQuestion]
    session_id: str


class InterviewFeedbackRequest(BaseModel):
    session_id: str
    question_index: int
    user_answer: str


class InterviewFeedbackResponse(BaseModel):
    score: float = Field(ge=0.0, le=10.0)
    feedback: str
    strengths: list[str]
    improvements: list[str]
    suggested_answer: str
