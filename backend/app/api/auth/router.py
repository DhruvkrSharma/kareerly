"""Auth Router - JWT validation endpoints."""

from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: AuthenticatedUser = Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    return UserResponse(id=user.id, email=user.email, role=user.role)


@router.post("/validate", response_model=UserResponse)
async def validate_token(user: AuthenticatedUser = Depends(get_current_user)):
    """Validate a JWT token and return user info."""
    return UserResponse(id=user.id, email=user.email, role=user.role)
