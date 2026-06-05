"""Tests for Auth endpoints and JWT security."""

import pytest
import jwt
import time
from app.core.security import verify_supabase_token, AuthError, AuthenticatedUser


class TestJWTValidation:
    def _make_token(self, payload: dict, secret: str = "test-jwt-secret-that-is-long-enough"):
        return jwt.encode(payload, secret, algorithm="HS256")

    def test_valid_token(self):
        token = self._make_token({
            "sub": "user-123",
            "email": "test@example.com",
            "role": "authenticated",
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
        })
        user = verify_supabase_token(token)
        assert isinstance(user, AuthenticatedUser)
        assert user.id == "user-123"
        assert user.email == "test@example.com"
        assert user.role == "authenticated"

    def test_expired_token(self):
        token = self._make_token({
            "sub": "user-123",
            "aud": "authenticated",
            "exp": int(time.time()) - 100,
        })
        with pytest.raises(AuthError, match="expired"):
            verify_supabase_token(token)

    def test_wrong_audience(self):
        token = self._make_token({
            "sub": "user-123",
            "aud": "wrong-audience",
            "exp": int(time.time()) + 3600,
        })
        with pytest.raises(AuthError, match="audience"):
            verify_supabase_token(token)

    def test_missing_sub_claim(self):
        token = self._make_token({
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
        })
        with pytest.raises(AuthError, match="sub"):
            verify_supabase_token(token)

    def test_invalid_token_string(self):
        with pytest.raises(AuthError, match="Invalid token"):
            verify_supabase_token("not-a-valid-jwt")

    def test_wrong_secret(self):
        token = self._make_token({
            "sub": "user-123",
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
        }, secret="wrong-secret")
        with pytest.raises(AuthError, match="Invalid token"):
            verify_supabase_token(token)
