"""
Jobs Router - Feed, swipe, saved jobs endpoints.

Migrated from:
- app/api/feed/route.ts
- app/api/swipe/route.ts
- app/api/saved/route.ts
"""

from fastapi import APIRouter, Depends, HTTPException
from app.core.dependencies import get_current_user, check_rate_limit
from app.core.security import AuthenticatedUser
from app.repositories.job_repository import JobRepository
from app.repositories.swipe_repository import SwipeRepository
from app.repositories.user_repository import UserRepository
from app.schemas.job import (
    FeedCard, FeedResponse, SwipeRequest, SwipeResponse,
    SavedJob, SavedResponse, JobDetail,
)
import math

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/feed", response_model=FeedResponse)
async def get_feed(user: AuthenticatedUser = Depends(check_rate_limit)):
    """
    Get personalized job feed for the authenticated user.
    
    Migrated from: GET /api/feed
    
    Flow:
    1. Ensure profile exists
    2. Call get_feed RPC (returns ranked recommendations)
    3. Fallback to raw active jobs if no recommendations
    """
    user_repo = UserRepository()
    job_repo = JobRepository()

    # Ensure profile exists
    await user_repo.ensure_profile_exists(user.id, user.email)

    # Try RPC-based feed
    data = await job_repo.get_feed_via_rpc(user.id, limit=20)

    if data:
        cards = [FeedCard(**item) for item in data]
        return FeedResponse(data=cards)

    # Fallback to raw jobs
    fallback_jobs = await job_repo.get_fallback_jobs(limit=20)
    fallback_cards = []
    for job in fallback_jobs:
        company = job.get("companies", {}) or {}
        fallback_cards.append(FeedCard(
            rec_id=0,
            job_id=job["id"],
            title=job["title"],
            company_name=company.get("name", "Company"),
            company_logo=company.get("logo_url"),
            location=job.get("location"),
            remote_ok=job.get("remote_ok", False),
            score=0.5,
            confidence=0.3,
            tier=3,
            score_factors={},
            apply_url=job.get("apply_url"),
        ))

    return FeedResponse(data=fallback_cards)


@router.post("/swipe", response_model=SwipeResponse)
async def swipe_job(
    body: SwipeRequest,
    user: AuthenticatedUser = Depends(check_rate_limit),
):
    """
    Record a swipe action (apply/save/reject).
    
    Migrated from: POST /api/swipe
    """
    swipe_repo = SwipeRepository()

    # Insert swipe event
    await swipe_repo.insert_swipe_event(
        user_id=user.id,
        job_id=body.job_id,
        action=body.action,
        session_id=body.session_id,
    )

    # Update recommendation if it exists
    if body.rec_id > 0:
        await swipe_repo.update_recommendation_swiped(body.rec_id, user.id, body.action)

    return SwipeResponse(success=True)


@router.get("/bookmarks", response_model=SavedResponse)
async def get_bookmarks(user: AuthenticatedUser = Depends(check_rate_limit)):
    """
    Get saved/applied jobs for Kanban board.
    
    Migrated from: GET /api/saved
    """
    swipe_repo = SwipeRepository()
    raw_data = await swipe_repo.get_saved_jobs(user.id)

    formatted = []
    for item in raw_data:
        job = item.get("jobs", {}) or {}
        company = job.get("companies", {}) or {}
        formatted.append(SavedJob(
            rec_id=item["id"],
            job_id=job.get("id", 0),
            title=job.get("title", "Unknown Role"),
            company_name=company.get("name", "Unknown Company"),
            company_slug=company.get("slug", ""),
            company_logo=company.get("logo_url"),
            location=job.get("location", "India"),
            remote_ok=job.get("remote_ok", False),
            score=round(item.get("score", 0) * 100),
            confidence=item.get("confidence", 0),
            tier=item.get("tier", 3),
            swipe_action=item.get("swipe_action", "save"),
            swiped_at=item.get("swiped_at"),
            apply_url=job.get("apply_url", "#"),
            skills=job.get("skills_required", []),
        ))

    return SavedResponse(data=formatted)


@router.get("/{job_id}", response_model=JobDetail)
async def get_job(job_id: int, user: AuthenticatedUser = Depends(get_current_user)):
    """Get a specific job by ID."""
    job_repo = JobRepository()
    job = await job_repo.get_job_by_id(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobDetail(**job)
