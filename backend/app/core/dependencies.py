"""
Kareerly FastAPI Backend - Dependencies

FastAPI dependency injection for auth, database, and rate limiting.
These are injected into route handlers via Depends().
"""

from fastapi import Depends, Request, HTTPException
from typing import Optional
from app.core.security import (
    AuthenticatedUser,
    verify_supabase_token,
    extract_token_from_header,
    extract_token_from_cookie,
    AuthError,
)
from app.core.database import get_supabase_client, supabase_rpc
from app.core.config import get_settings
from supabase import Client
import logging

logger = logging.getLogger(__name__)


async def get_current_user(request: Request) -> AuthenticatedUser:
    """
    FastAPI dependency that extracts and validates the authenticated user.
    
    Token extraction order:
    1. Authorization header (Bearer token)
    2. Supabase auth cookies (forwarded by Next.js rewrite)
    
    Interview Note: This is the single point of auth enforcement.
    Every protected endpoint uses Depends(get_current_user).
    """
    # Try Authorization header first
    auth_header = request.headers.get("authorization")
    token = extract_token_from_header(auth_header)

    # Fall back to cookies (from Next.js proxy)
    if not token:
        token = extract_token_from_cookie(dict(request.cookies))

    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        user = verify_supabase_token(token)
    except AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    return user


async def get_optional_user(request: Request) -> Optional[AuthenticatedUser]:
    """
    Like get_current_user but returns None instead of raising.
    Useful for endpoints that work with or without auth.
    """
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def get_db() -> Client:
    """FastAPI dependency for Supabase client."""
    return get_supabase_client()


async def check_rate_limit(request: Request, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Rate limiting dependency.
    
    Calls the existing Postgres check_rate_limit() function directly,
    replacing the Supabase Edge Function round-trip.
    
    Interview Note: By calling the Postgres function directly from FastAPI,
    we eliminate the Edge Function hop, reducing latency by ~100ms per request.
    """
    settings = get_settings()
    endpoint = request.url.path.split("/")[1] if request.url.path else "default"
    identifier = f"{endpoint}:{user.id}"

    try:
        result = await supabase_rpc("check_rate_limit", {
            "p_id": identifier,
            "p_window_ms": settings.RATE_LIMIT_WINDOW_MS,
            "p_max_requests": settings.RATE_LIMIT_MAX_REQUESTS,
        })

        if isinstance(result, dict) and not result.get("success", True):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please slow down.",
                headers={
                    "X-RateLimit-Remaining": str(result.get("remaining", 0)),
                    "X-RateLimit-Reset": str(result.get("reset", 0)),
                },
            )
    except HTTPException:
        raise
    except Exception as e:
        settings = get_settings()
        if settings.ENVIRONMENT in ("production", "staging"):
            logger.error(f"Rate limit check failed in {settings.ENVIRONMENT}: {e}")
            raise HTTPException(
                status_code=503,
                detail="Rate limiting service unavailable. Please try again shortly.",
            )
        # Fail-open in local/test environments only
        pass

    return user
