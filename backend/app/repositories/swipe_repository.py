"""Swipe Repository - Database operations for swipe_events and recommendations."""

from app.core.config import get_settings
from app.core.database import get_supabase_rest_headers
import httpx


class SwipeRepository:
    def __init__(self):
        self.settings = get_settings()

    async def insert_swipe_event(self, user_id: str, job_id: int, action: str, session_id: str = None):
        """Insert a swipe event."""
        headers = get_supabase_rest_headers()
        headers["Prefer"] = "return=representation"
        url = f"{self.settings.SUPABASE_URL}/rest/v1/swipe_events"

        payload = {
            "user_id": user_id,
            "job_id": job_id,
            "action": action,
            "session_id": session_id,
        }

        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, headers=headers)

    async def update_recommendation_swiped(self, rec_id: int, user_id: str, action: str):
        """Update recommendation to mark as swiped."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/recommendations"
            f"?id=eq.{rec_id}&user_id=eq.{user_id}"
        )

        from datetime import datetime
        payload = {
            "swiped": True,
            "swiped_at": datetime.utcnow().isoformat(),
            "swipe_action": action,
        }

        async with httpx.AsyncClient() as client:
            await client.patch(url, json=payload, headers=headers)

    async def update_pipeline_stage(self, rec_id: int, user_id: str, stage: str):
        """Update the Kanban pipeline stage for a recommendation."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/recommendations"
            f"?id=eq.{rec_id}&user_id=eq.{user_id}"
        )
        payload = {"pipeline_stage": stage}

        async with httpx.AsyncClient() as client:
            await client.patch(url, json=payload, headers=headers)

    async def get_saved_jobs(self, user_id: str) -> list[dict]:
        """Fetch saved/applied jobs for a user via recommendations join."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/recommendations"
            f"?user_id=eq.{user_id}&swiped=is.true"
            f"&swipe_action=in.(save,apply)"
            f"&order=swiped_at.desc"
            f"&select=id,score,confidence,tier,swipe_action,pipeline_stage,swiped_at,"
            f"jobs(id,title,location,remote_ok,salary_min,salary_max,apply_url,"
            f"skills_required,companies(name,slug,logo_url))"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            return []
