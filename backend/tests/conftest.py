"""Pytest configuration and shared fixtures."""

import pytest
from unittest.mock import patch, MagicMock

# Mock settings for testing (prevents real env vars from being needed)
MOCK_SETTINGS = {
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-key",
    "SUPABASE_JWT_SECRET": "test-jwt-secret-that-is-long-enough",
    "GROQ_API_KEY": "test-groq-key",
    "HUGGINGFACE_API_KEY": "test-hf-key",
    "BROWSERLESS_API_KEY": "",
    "DEBUG": "true",
    "ENVIRONMENT": "test",
}


@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    """Set mock environment variables for all tests."""
    for key, value in MOCK_SETTINGS.items():
        monkeypatch.setenv(key, value)

    # Clear the cached settings
    from app.core.config import get_settings
    get_settings.cache_clear()
