"""Scraper Router - Scraping orchestration endpoints."""

from fastapi import APIRouter, Depends, BackgroundTasks
from app.core.dependencies import get_current_user
from app.core.security import AuthenticatedUser
from app.services.scraper_service import ScraperService, SCRAPER_TARGETS

router = APIRouter(prefix="/scraper", tags=["Scraper"])

# In-memory status tracking
_scraper_status = {"status": "idle", "last_run": None, "last_result": None}


@router.post("/run")
async def run_scraper(
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Trigger a full scraping run across all configured career pages.
    Runs asynchronously in the background.
    """
    if _scraper_status["status"] == "running":
        return {"status": "already_running", "message": "A scrape is already in progress"}

    _scraper_status["status"] = "running"

    async def _run():
        service = ScraperService()
        try:
            result = await service.run_scrape()
            _scraper_status["last_result"] = result
        except Exception as e:
            _scraper_status["last_result"] = {"error": str(e)}
        finally:
            from datetime import datetime
            _scraper_status["status"] = "idle"
            _scraper_status["last_run"] = datetime.utcnow().isoformat()

    background_tasks.add_task(_run)
    return {"status": "started", "message": "Scraping started in background"}


@router.post("/company/{company_name}")
async def scrape_company(
    company_name: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Scrape a single company by name."""
    service = ScraperService()
    result = await service.run_single_company(company_name)
    return result


@router.get("/status")
async def get_scraper_status(user: AuthenticatedUser = Depends(get_current_user)):
    """Get the current scraper status."""
    return _scraper_status


@router.get("/history")
async def get_scraper_targets(user: AuthenticatedUser = Depends(get_current_user)):
    """Get list of configured scraper targets."""
    return {"targets": SCRAPER_TARGETS, "total": len(SCRAPER_TARGETS)}
