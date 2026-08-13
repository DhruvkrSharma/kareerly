"""
Background Workers - APScheduler-based task scheduling.

Handles periodic tasks:
- Scraping (every 6h)
- Embedding generation (every 1h)
- Score decay (daily)
- Recommendation refresh (every 2h)
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def scrape_job():
    """Periodic scraping task."""
    logger.info("🔄 Running scheduled scrape...")
    try:
        from app.services.scraper_service import ScraperService
        service = ScraperService()
        result = await service.run_scrape()
        logger.info(f"✅ Scrape complete: {result}")
    except Exception as e:
        logger.error(f"❌ Scrape failed: {e}")


async def embed_job():
    """Periodic embedding generation task."""
    logger.info("🔄 Running scheduled embedding...")
    try:
        from app.services.embedding_service import EmbeddingService
        service = EmbeddingService()
        count = await service.embed_unembedded_jobs()
        logger.info(f"✅ Embedded {count} jobs")
    except Exception as e:
        logger.error(f"❌ Embedding failed: {e}")


async def decay_job():
    """Periodic score decay task."""
    logger.info("🔄 Running scheduled score decay...")
    try:
        from app.core.database import supabase_rpc
        await supabase_rpc("decay_recommendation_scores", {})
        logger.info("✅ Score decay complete")
    except Exception as e:
        logger.error(f"❌ Score decay failed: {e}")


async def recommendation_job():
    """Periodic recommendation refresh for active users."""
    logger.info("🔄 Running scheduled recommendation refresh...")
    try:
        from app.services.recommendation_service import RecommendationService
        from app.core.database import get_supabase_client

        service = RecommendationService()
        client = get_supabase_client()
        result = client.table("profiles").select("id").eq("profile_completed", True).execute()
        profiles = result.data or []

        refreshed = 0
        for row in profiles:
            user_id = row.get("id")
            if not user_id:
                continue
            await service.generate_for_user(user_id)
            refreshed += 1

        logger.info(f"✅ Recommendation refresh complete for {refreshed} users")
    except Exception as e:
        logger.error(f"❌ Recommendation refresh failed: {e}")


def setup_scheduler():
    """Configure and start the APScheduler."""
    settings = get_settings()

    scheduler.add_job(scrape_job, "interval", hours=settings.SCRAPER_INTERVAL_HOURS, id="scrape")
    scheduler.add_job(embed_job, "interval", hours=settings.EMBEDDING_INTERVAL_HOURS, id="embed")
    scheduler.add_job(decay_job, "interval", hours=settings.DECAY_INTERVAL_HOURS, id="decay")
    scheduler.add_job(
        recommendation_job,
        "interval",
        hours=settings.RECOMMENDATION_INTERVAL_HOURS,
        id="recommendations",
    )

    scheduler.start()
    logger.info("📅 APScheduler started with periodic tasks")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    scheduler.shutdown()
    logger.info("📅 APScheduler shut down")
