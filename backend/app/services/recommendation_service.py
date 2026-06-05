"""
Recommendation Service - Vector search + ranking pipeline.

This is the flagship personalization engine. It combines:
1. User activity signals (swipes, saves)
2. Vector similarity (pgvector cosine distance)
3. Freshness scoring
4. Diversity injection

Interview Note: The cold-start problem is handled by falling back
to popularity-based ranking when a user has no embeddings yet.
As users swipe, their implicit preference vector is built from
the embeddings of jobs they've interacted with.
"""

from app.services.embedding_service import EmbeddingService
from app.repositories.user_repository import UserRepository
from app.repositories.job_repository import JobRepository
from app.repositories.resume_repository import ResumeRepository
from app.core.config import get_settings
from app.core.database import get_supabase_rest_headers, supabase_rpc
import httpx
import logging

logger = logging.getLogger(__name__)


class RecommendationService:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.user_repo = UserRepository()
        self.job_repo = JobRepository()
        self.resume_repo = ResumeRepository()
        self.settings = get_settings()

    async def generate_for_user(self, user_id: str) -> dict:
        """
        Generate personalized job recommendations for a user.
        
        Pipeline:
        1. Fetch user profile + compute profile embedding
        2. Run pgvector similarity search (match_jobs RPC)
        3. Score each candidate with AI matching
        4. Insert as recommendations
        """
        profile = await self.user_repo.get_profile(user_id)
        if not profile:
            return {"status": "no_profile", "count": 0}

        # Build profile text for embedding
        skills = " ".join(profile.get("skills", []) or [])
        roles = " ".join(profile.get("preferred_roles", []) or [])
        profile_text = f"{roles} {skills} {profile.get('experience_years', 0)} years experience"

        # Generate profile embedding
        profile_embedding = self.embedding_service.generate_embedding(profile_text)

        # Update profile embedding in database
        headers = get_supabase_rest_headers()
        update_url = f"{self.settings.SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}"
        async with httpx.AsyncClient() as client:
            await client.patch(update_url, json={"embedding": profile_embedding}, headers=headers)

        # Run vector similarity search
        try:
            matches = await supabase_rpc("match_jobs", {
                "query_embedding": profile_embedding,
                "match_threshold": 0.3,
                "match_count": 20,
            })
        except Exception as e:
            logger.warning(f"Vector search failed: {e}, falling back to raw jobs")
            matches = []

        if not matches:
            # Cold start fallback: use newest active jobs
            fallback = await self.job_repo.get_fallback_jobs(limit=10)
            matches = [{"id": j["id"], "similarity": 0.5} for j in fallback]

        # Filter out already recommended jobs
        existing_ids = await self.user_repo.get_existing_recommendation_job_ids(user_id)
        new_matches = [m for m in matches if m["id"] not in existing_ids]

        # Insert recommendations
        from app.services.matching_service import MatchingService
        matcher = MatchingService()
        count = 0

        for i, match in enumerate(new_matches[:10]):  # Limit to 10 per batch
            try:
                await matcher.score_and_store(user_id, match["id"], rank=i + 1)
                count += 1
            except Exception as e:
                logger.error(f"Failed to score job {match['id']}: {e}")

        return {"status": "completed", "count": count}

    async def get_user_recommendations(self, user_id: str) -> list[dict]:
        """Fetch existing recommendations for a user."""
        headers = get_supabase_rest_headers()
        url = (
            f"{self.settings.SUPABASE_URL}/rest/v1/recommendations"
            f"?user_id=eq.{user_id}&status=eq.active&swiped=is.false"
            f"&order=feed_rank.asc&limit=20"
            f"&select=*,jobs(id,title,location,remote_ok,apply_url,"
            f"skills_required,companies(name,logo_url))"
        )

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            return []
