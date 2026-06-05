"""
Kareerly FastAPI Backend - Application Entry Point

This is the main FastAPI application factory. It:
1. Configures CORS for the Next.js frontend
2. Registers all API routers
3. Sets up APScheduler for background tasks
4. Provides health check and OpenAPI docs

Interview Note: We use FastAPI's lifespan context manager for
clean startup/shutdown of background workers. This ensures
graceful shutdown of the APScheduler when the server stops.
"""

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import get_settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Kareerly FastAPI starting...")

    # Start background workers
    try:
        from app.workers.scheduler import setup_scheduler
        setup_scheduler()
    except Exception as e:
        logger.warning(f"APScheduler setup failed (non-fatal): {e}")

    yield

    # Shutdown
    try:
        from app.workers.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass
    logger.info("👋 Kareerly FastAPI shut down")


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI-native Career Intelligence Platform for Indian Tech",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS - allow Next.js frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from starlette.exceptions import HTTPException as StarletteHTTPException
    # Custom exception handlers for Next.js compatibility
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        return JSONResponse(
            status_code=422,
            content={"error": "Validation Error", "detail": exc.errors()},
        )

    # Register API routers
    from app.api.auth.router import router as auth_router
    from app.api.jobs.router import router as jobs_router
    from app.api.resume.router import router as resume_router
    from app.api.matching.router import router as matching_router
    from app.api.recommendations.router import router as recommendations_router
    from app.api.interview.router import router as interview_router
    from app.api.scraper.router import router as scraper_router
    from app.api.analytics.router import router as analytics_router

    app.include_router(auth_router)
    app.include_router(jobs_router)
    app.include_router(resume_router)
    app.include_router(matching_router)
    app.include_router(recommendations_router)
    app.include_router(interview_router)
    app.include_router(scraper_router)
    app.include_router(analytics_router)

    @app.get("/", tags=["Health"])
    async def root():
        return {
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "healthy",
            "docs": "/docs",
        }

    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "ok"}

    return app


# Create the app instance
app = create_app()
