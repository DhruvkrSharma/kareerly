"""Interview Router - AI Interview Copilot endpoints."""

from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.services.interview_service import InterviewService
from app.schemas.interview import (
    InterviewGenerateRequest,
    InterviewGenerateResponse,
    InterviewFeedbackRequest,
    InterviewFeedbackResponse,
)

router = APIRouter(prefix="/interview", tags=["Interview Copilot"])


@router.post("/generate", response_model=InterviewGenerateResponse)
async def generate_interview(
    body: InterviewGenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generate tailored interview questions for a job posting.
    
    Creates a session with questions that can be answered
    and evaluated individually via /interview/feedback.
    """
    service = InterviewService()
    return await service.generate_questions(
        user_id=user.id,
        job_id=body.job_id,
        question_types=body.question_types,
        num_questions=body.num_questions,
    )


@router.post("/feedback", response_model=InterviewFeedbackResponse)
async def get_feedback(
    body: InterviewFeedbackRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Evaluate a user's answer to an interview question.
    
    Returns AI-generated feedback with score, strengths,
    areas for improvement, and a suggested better answer.
    """
    service = InterviewService()
    return await service.evaluate_answer(
        session_id=body.session_id,
        question_index=body.question_index,
        user_answer=body.user_answer,
    )
