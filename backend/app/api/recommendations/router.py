"""Recommendations Router - Personalized job recommendation endpoints."""

from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("/generate")
async def generate_recommendations(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Generate personalized job recommendations for the current user.
    
    Pipeline:
    1. Compute user profile embedding
    2. Run pgvector similarity search
    3. Score matches with AI
    4. Insert as ranked recommendations
    """
    service = RecommendationService()
    result = await service.generate_for_user(user.id)
    return result


@router.get("/user/{user_id}")
async def get_user_recommendations(
    user_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Get existing recommendations for a user."""
    # Only allow users to view their own recommendations
    if user_id != user.id:
        user_id = user.id

    service = RecommendationService()
    return await service.get_user_recommendations(user_id)
