"""Matching Router - AI job matching score endpoints."""

from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.services.matching_service import MatchingService
from app.schemas.matching import MatchScoreRequest, MatchScoreResponse

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.post("/score", response_model=MatchScoreResponse)
async def score_job(
    body: MatchScoreRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generate an AI match score between the current user and a job.
    
    Returns structured analysis with score, confidence, tier,
    why_matched reasons, and resume_gaps.
    """
    service = MatchingService()
    target_user = body.user_id or user.id
    return await service.score_job_for_user(target_user, body.job_id)
