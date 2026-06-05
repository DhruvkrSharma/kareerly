"""Resume Repository - Database operations for tailored_resumes table."""

from app.core.config import get_settings
from app.core.database import get_supabase_rest_headers
from typing import Optional
import httpx


class ResumeRepository:
    def __init__(self):
        self.settings = get_settings()

    async def get_cached_resume(self, user_id: str, job_id: int) -> Optional[str]:
        """Check if a tailored resume already exists for this user+job combo."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/tailored_resumes"
            f"?user_id=eq.{user_id}&job_id=eq.{job_id}&select=content"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data:
                    return data[0]["content"]
            return None

    async def upsert_resume(self, user_id: str, job_id: int, content: str):
        """Cache a tailored resume."""
        headers = get_supabase_rest_headers()
        headers["Prefer"] = "return=representation,resolution=merge-duplicates"
        url = f"{self.settings.SUPABASE_URL}/rest/v1/tailored_resumes?on_conflict=user_id,job_id"

        payload = {
            "user_id": user_id,
            "job_id": job_id,
            "content": content,
        }

        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, headers=headers)

    async def get_resume_history(self, user_id: str) -> list[dict]:
        """Get all tailored resumes for a user."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/tailored_resumes"
            f"?user_id=eq.{user_id}&order=created_at.desc"
            f"&select=id,job_id,content,created_at"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            return []

    async def get_resume_by_id(self, resume_id: str, user_id: str) -> Optional[dict]:
        """Get a specific tailored resume."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/tailored_resumes"
            f"?id=eq.{resume_id}&user_id=eq.{user_id}&select=*"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                return data[0] if data else None
            return None

    async def insert_recommendation(self, rec: dict):
        """Insert a new recommendation."""
        headers = get_supabase_rest_headers()
        headers["Prefer"] = "return=representation"
        url = f"{self.settings.SUPABASE_URL}/rest/v1/recommendations"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=rec, headers=headers)
            response.raise_for_status()
            return response.json()
