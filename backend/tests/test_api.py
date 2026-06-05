"""Tests for FastAPI API endpoints using TestClient."""

import pytest
import jwt
import time
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient


def _make_auth_header(user_id="test-user-123", secret="test-jwt-secret-that-is-long-enough"):
    """Create a valid JWT auth header for testing."""
    token = jwt.encode({
        "sub": user_id,
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
    }, secret, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    """Create a test client."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    from app.main import app
    return TestClient(app)


class TestHealthEndpoints:
    def test_root(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    def test_health(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestAuthEndpoints:
    def test_me_unauthorized(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_me_authorized(self, client):
        response = client.get("/auth/me", headers=_make_auth_header())
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test-user-123"
        assert data["email"] == "test@example.com"

    def test_validate_authorized(self, client):
        response = client.post("/auth/validate", headers=_make_auth_header())
        assert response.status_code == 200


class TestJobsEndpoints:
    @patch("app.repositories.user_repository.UserRepository.ensure_profile_exists", new_callable=AsyncMock)
    @patch("app.repositories.user_repository.UserRepository.get_profile", new_callable=AsyncMock)
    @patch("app.repositories.job_repository.JobRepository.get_feed_via_rpc", new_callable=AsyncMock)
    @patch("app.repositories.job_repository.JobRepository.get_fallback_jobs", new_callable=AsyncMock)
    @patch("app.core.dependencies.supabase_rpc", new_callable=AsyncMock)
    def test_feed_returns_fallback(self, mock_rpc, mock_fallback, mock_feed, mock_profile, mock_ensure, client):
        mock_rpc.return_value = {"success": True, "remaining": 29, "reset": 0}
        mock_ensure.return_value = None
        mock_profile.return_value = {"id": "test-user-123"}
        mock_feed.return_value = []
        mock_fallback.return_value = [
            {"id": 1, "title": "Test Job", "location": "Remote", "remote_ok": True,
             "apply_url": "https://test.com", "skills_required": ["Python"],
             "companies": {"name": "TestCorp", "logo_url": None}}
        ]

        response = client.get("/jobs/feed", headers=_make_auth_header())
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["title"] == "Test Job"

    def test_feed_unauthorized(self, client):
        response = client.get("/jobs/feed")
        assert response.status_code == 401

    @patch("app.repositories.swipe_repository.SwipeRepository.insert_swipe_event", new_callable=AsyncMock)
    @patch("app.repositories.swipe_repository.SwipeRepository.update_recommendation_swiped", new_callable=AsyncMock)
    @patch("app.core.dependencies.supabase_rpc", new_callable=AsyncMock)
    def test_swipe_save(self, mock_rpc, mock_update, mock_insert, client):
        mock_rpc.return_value = {"success": True, "remaining": 29, "reset": 0}
        mock_insert.return_value = None
        mock_update.return_value = None

        response = client.post("/jobs/swipe", headers=_make_auth_header(), json={
            "job_id": 101, "rec_id": 5, "action": "save"
        })
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_swipe_invalid_action(self, client):
        response = client.post("/jobs/swipe", headers=_make_auth_header(), json={
            "job_id": 101, "action": "invalid_action"
        })
        assert response.status_code == 422

    @patch("app.repositories.swipe_repository.SwipeRepository.get_saved_jobs", new_callable=AsyncMock)
    @patch("app.core.dependencies.supabase_rpc", new_callable=AsyncMock)
    def test_bookmarks(self, mock_rpc, mock_saved, client):
        mock_rpc.return_value = {"success": True, "remaining": 29, "reset": 0}
        mock_saved.return_value = [{
            "id": 1, "score": 0.8, "confidence": 0.7, "tier": 1,
            "swipe_action": "save", "swiped_at": "2024-01-01",
            "jobs": {"id": 101, "title": "Engineer", "location": "Remote",
                     "remote_ok": True, "salary_min": None, "salary_max": None,
                     "apply_url": "https://test.com", "skills_required": ["Python"],
                     "companies": {"name": "TestCo", "slug": "testco", "logo_url": None}}
        }]

        response = client.get("/jobs/bookmarks", headers=_make_auth_header())
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["title"] == "Engineer"


class TestResumeEndpoints:
    @patch("app.services.resume_service.ResumeService.tailor_resume", new_callable=AsyncMock)
    @patch("app.core.dependencies.supabase_rpc", new_callable=AsyncMock)
    def test_tailor(self, mock_rpc, mock_tailor, client):
        mock_rpc.return_value = {"success": True, "remaining": 29, "reset": 0}
        mock_tailor.return_value = "# Tailored Resume\n\nGreat match!"

        response = client.post("/resume/tailor", headers=_make_auth_header(), json={"job_id": 42})
        assert response.status_code == 200
        assert "Tailored Resume" in response.json()["data"]

    def test_tailor_unauthorized(self, client):
        response = client.post("/resume/tailor", json={"job_id": 42})
        assert response.status_code == 401
