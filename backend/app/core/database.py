"""
Kareerly FastAPI Backend - Database Client

Provides async Supabase client for all database operations.
Uses service_role_key to bypass RLS (user-scoping enforced in application code).
"""

from supabase import create_client, Client
from app.core.config import get_settings
from functools import lru_cache
import httpx


@lru_cache()
def get_supabase_client() -> Client:
    """
    Creates and caches a Supabase client using the service role key.
    
    Interview Note: We use service_role_key (not anon key) because FastAPI
    operates as a trusted backend. RLS is bypassed — user-scoping is enforced
    in repository layer by always filtering on user_id.
    """
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_supabase_rest_headers() -> dict:
    """Headers for direct REST API calls to Supabase."""
    settings = get_settings()
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


async def supabase_rpc(function_name: str, params: dict) -> dict:
    """
    Call a Supabase Postgres RPC function directly via REST.
    Used for functions like get_feed, check_rate_limit, etc.
    """
    settings = get_settings()
    url = f"{settings.SUPABASE_URL}/rest/v1/rpc/{function_name}"
    headers = get_supabase_rest_headers()

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=params, headers=headers)
        response.raise_for_status()
        return response.json()
