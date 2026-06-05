"""
Kareerly FastAPI Backend - Core Configuration

Centralized settings management using Pydantic Settings.
All environment variables are validated at startup.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "Kareerly API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str = ""

    # Groq AI
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_RESUME_MODEL: str = "llama3-8b-8192"

    # Embeddings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    HUGGINGFACE_API_KEY: str = ""

    # Scraping
    BROWSERLESS_API_KEY: str = ""
    SCRAPER_MAX_JOBS_PER_COMPANY: int = 3
    SCRAPER_TIMEOUT_MS: int = 30000

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS: int = 60000
    RATE_LIMIT_MAX_REQUESTS: int = 30
    RATE_LIMIT_RESUME_MAX: int = 5

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://kareerly.vercel.app",
    ]

    # Workers
    SCRAPER_INTERVAL_HOURS: int = 6
    EMBEDDING_INTERVAL_HOURS: int = 1
    DECAY_INTERVAL_HOURS: int = 24
    RECOMMENDATION_INTERVAL_HOURS: int = 2

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance - loaded once at startup."""
    return Settings()
