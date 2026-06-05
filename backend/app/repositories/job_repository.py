"""
Job Repository - Database operations for jobs table.

Interview Note: The Repository pattern decouples data access from business logic.
Each repository method maps to a specific database operation. The service layer
calls repositories, never the database directly.
"""

from app.core.database import get_supabase_client, get_supabase_rest_headers
from app.core.config import get_settings
from typing import Optional
import httpx


class JobRepository:
    def __init__(self):
        self.client = get_supabase_client()
        self.settings = get_settings()

    async def get_feed_via_rpc(self, user_id: str, limit: int = 20) -> list[dict]:
        """Call the get_feed Postgres function."""
        headers = get_supabase_rest_headers()
        url = f"{self.settings.SUPABASE_URL}/rest/v1/rpc/get_feed"

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json={"p_user_id": user_id, "p_limit": limit},
                headers=headers,
            )
            if response.status_code == 200:
                return response.json()
            return []

    async def get_fallback_jobs(self, limit: int = 20) -> list[dict]:
        """Fetch raw active jobs when no recommendations exist."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/jobs"
            f"?is_active=is.true&order=scraped_at.desc&limit={limit}"
            f"&select=id,title,location,remote_ok,apply_url,skills_required,"
            f"company_id,companies(name,logo_url)"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            return []

    async def get_job_by_id(self, job_id: int) -> Optional[dict]:
        """Fetch a single job with company details."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/jobs"
            f"?id=eq.{job_id}&select=*,companies(name)"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                return data[0] if data else None
            return None

    async def upsert_jobs(self, jobs: list[dict]) -> list[dict]:
        """Upsert jobs with deduplication on content_hash."""
        headers = get_supabase_rest_headers()
        headers["Prefer"] = "return=representation,resolution=merge-duplicates"
        url = f"{self.settings.SUPABASE_URL}/rest/v1/jobs?on_conflict=content_hash"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=jobs, headers=headers)
            if response.status_code in (200, 201):
                return response.json()
            return []

    async def upsert_companies(self, companies: list[dict]) -> list[dict]:
        """Upsert companies with deduplication on slug."""
        headers = get_supabase_rest_headers()
        headers["Prefer"] = "return=representation,resolution=merge-duplicates"
        url = f"{self.settings.SUPABASE_URL}/rest/v1/companies?on_conflict=slug"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=companies, headers=headers)
            if response.status_code in (200, 201):
                return response.json()
            return []

    async def get_all_companies(self) -> list[dict]:
        """Fetch all companies for ID mapping."""
        headers = get_supabase_rest_headers()
        url = f"{self.settings.SUPABASE_URL}/rest/v1/companies?select=id,name,location,slug"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            return []
