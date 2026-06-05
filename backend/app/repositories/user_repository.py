"""User Repository - Database operations for profiles table."""

from app.core.config import get_settings
from app.core.database import get_supabase_rest_headers
from typing import Optional
import httpx


class UserRepository:
    def __init__(self):
        self.settings = get_settings()

    async def get_profile(self, user_id: str) -> Optional[dict]:
        """Fetch user profile by ID."""
        headers = get_supabase_rest_headers()
        url = f"{self.settings.SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=*"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                return data[0] if data else None
            return None

    async def ensure_profile_exists(self, user_id: str, email: str = None):
        """Create profile if it doesn't exist."""
        profile = await self.get_profile(user_id)
        if not profile:
            headers = get_supabase_rest_headers()
            headers["Prefer"] = "return=representation"
            url = f"{self.settings.SUPABASE_URL}/rest/v1/profiles"

            async with httpx.AsyncClient() as client:
                await client.post(url, json={"id": user_id, "email": email}, headers=headers)

    async def get_existing_recommendation_job_ids(self, user_id: str) -> list[int]:
        """Get job IDs already recommended to a user."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/recommendations"
            f"?user_id=eq.{user_id}&select=job_id"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return [r["job_id"] for r in response.json()]
            return []
