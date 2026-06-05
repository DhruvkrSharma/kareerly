"""Analytics Router - Usage and skill analytics endpoints."""

from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.core.config import get_settings
from app.core.database import get_supabase_rest_headers
import httpx

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/user")
async def get_user_analytics(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Get analytics for the current user.
    
    Returns: application count, save count, match score distribution,
    interview count, and activity timeline.
    """
    settings = get_settings()
    headers = get_supabase_rest_headers()

    # Count swipe events by action
    url = f"{settings.SUPABASE_URL}/rest/v1/swipe_events?user_id=eq.{user.id}&select=action"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        events = resp.json() if resp.status_code == 200 else []

    applies = sum(1 for e in events if e.get("action") == "apply")
    saves = sum(1 for e in events if e.get("action") == "save")
    rejects = sum(1 for e in events if e.get("action") == "reject")

    # Get recommendation score distribution
    url = f"{settings.SUPABASE_URL}/rest/v1/recommendations?user_id=eq.{user.id}&select=score,tier"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        recs = resp.json() if resp.status_code == 200 else []

    tier_dist = {1: 0, 2: 0, 3: 0, 4: 0}
    for r in recs:
        tier = r.get("tier", 3)
        tier_dist[tier] = tier_dist.get(tier, 0) + 1

    avg_score = sum(r.get("score", 0) for r in recs) / len(recs) if recs else 0

    # Count tailored resumes
    url = f"{settings.SUPABASE_URL}/rest/v1/tailored_resumes?user_id=eq.{user.id}&select=id"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        resumes = resp.json() if resp.status_code == 200 else []

    return {
        "total_swipes": len(events),
        "applications": applies,
        "bookmarks": saves,
        "rejections": rejects,
        "total_recommendations": len(recs),
        "average_match_score": round(avg_score, 3),
        "tier_distribution": tier_dist,
        "tailored_resumes": len(resumes),
    }


@router.get("/skills")
async def get_skill_trends(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Get trending skills across active job listings.
    
    Aggregates skills_required from all active jobs to show
    which skills are most in-demand.
    """
    settings = get_settings()
    headers = get_supabase_rest_headers()

    url = f"{settings.SUPABASE_URL}/rest/v1/jobs?is_active=is.true&select=skills_required"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        jobs = resp.json() if resp.status_code == 200 else []

    skill_counts: dict[str, int] = {}
    for job in jobs:
        for skill in (job.get("skills_required") or []):
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

    # Sort by count descending
    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "total_jobs": len(jobs),
        "trending_skills": [{"skill": s, "count": c} for s, c in sorted_skills[:20]],
    }


@router.get("/jobs")
async def get_job_analytics(user: AuthenticatedUser = Depends(get_current_user)):
    """Get job market analytics."""
    settings = get_settings()
    headers = get_supabase_rest_headers()

    url = f"{settings.SUPABASE_URL}/rest/v1/jobs?is_active=is.true&select=id,location,remote_ok,job_type"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        jobs = resp.json() if resp.status_code == 200 else []

    locations: dict[str, int] = {}
    remote_count = 0
    type_dist: dict[str, int] = {}

    for job in jobs:
        loc = job.get("location", "Unknown")
        locations[loc] = locations.get(loc, 0) + 1
        if job.get("remote_ok"):
            remote_count += 1
        jt = job.get("job_type", "fulltime")
        type_dist[jt] = type_dist.get(jt, 0) + 1

    return {
        "total_active_jobs": len(jobs),
        "remote_jobs": remote_count,
        "location_distribution": dict(sorted(locations.items(), key=lambda x: x[1], reverse=True)[:10]),
        "type_distribution": type_dist,
    }
