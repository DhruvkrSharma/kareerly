from fastapi import APIRouter, Depends, HTTPException
from app.core.dependencies import get_current_user, check_rate_limit
from app.core.security import AuthenticatedUser
from app.repositories.user_repository import UserRepository
from app.services.recommendation_service import RecommendationService
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    skills: List[str] = []
    preferred_roles: List[str] = []
    experience_years: int = 0
    preferred_locations: List[str] = []
    resume_url: Optional[str] = None


@router.post("/update")
async def update_profile(
    body: ProfileUpdateRequest,
    user: AuthenticatedUser = Depends(check_rate_limit),
):
    """
    Update user profile and trigger initial personalization & recommendation generation.
    """
    user_repo = UserRepository()
    rec_service = RecommendationService()

    # Calculate completion score
    score = 0
    if body.full_name and body.full_name.strip():
        score += 20
    if body.skills:
        score += 30
    if body.preferred_roles:
        score += 25
    if body.experience_years > 0:
        score += 15
    if body.preferred_locations:
        score += 10

    now = datetime.utcnow().isoformat() + "Z"

    update_data = {
        "full_name": body.full_name,
        "skills": body.skills,
        "preferred_roles": body.preferred_roles,
        "experience_years": body.experience_years,
        "preferred_locations": body.preferred_locations,
        "resume_url": body.resume_url,
        "profile_completed": True,
        "onboarding_completed_at": now,
        "profile_completion_score": score,
        "updated_at": now,
    }

    try:
        # Save profile to database
        profile = await user_repo.update_profile(user.id, update_data)

        # Trigger background recommendations generation
        # (This computes embedding, runs pgvector match, scores, and inserts them)
        await rec_service.generate_for_user(user.id)

        return {"success": True, "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
