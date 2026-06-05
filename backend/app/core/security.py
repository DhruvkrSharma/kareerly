"""
Kareerly FastAPI Backend - Security Layer

JWT validation for Supabase Auth tokens.

Interview Note: Supabase Auth issues standard JWTs signed with the project's
JWT secret. We validate these server-side without calling Supabase Auth API,
which means zero network latency for auth checks. The JWT contains the user's
UUID in the 'sub' claim.
"""

import jwt
from datetime import datetime, timezone
from typing import Optional
from app.core.config import get_settings


class AuthError(Exception):
    """Raised when JWT validation fails."""
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code


class AuthenticatedUser:
    """Represents a validated user extracted from JWT."""
    def __init__(self, id: str, email: Optional[str] = None, role: str = "authenticated"):
        self.id = id
        self.email = email
        self.role = role

    def __repr__(self):
        return f"AuthenticatedUser(id={self.id}, email={self.email})"


def verify_supabase_token(token: str) -> AuthenticatedUser:
    """
    Validate a Supabase JWT and extract the user.
    
    Supabase JWTs contain:
    - sub: user UUID
    - email: user email
    - role: 'authenticated' or 'anon'
    - exp: expiration timestamp
    
    The JWT is signed with the project's JWT secret (HS256).
    """
    settings = get_settings()

    if not settings.SUPABASE_JWT_SECRET:
        raise AuthError("SUPABASE_JWT_SECRET not configured")

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise AuthError("Token has expired")
    except jwt.InvalidAudienceError:
        raise AuthError("Invalid token audience")
    except jwt.InvalidTokenError as e:
        raise AuthError(f"Invalid token: {str(e)}")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthError("Token missing 'sub' claim")

    return AuthenticatedUser(
        id=user_id,
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
    )


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    if not authorization:
        return None
    parts = authorization.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def extract_token_from_cookie(cookies: dict) -> Optional[str]:
    """
    Extract Supabase auth token from cookies.
    
    Supabase stores auth tokens in cookies with names like:
    sb-<project-ref>-auth-token
    """
    for name, value in cookies.items():
        if "auth-token" in name and value:
            # Supabase stores a base64-encoded JSON with access_token
            try:
                import json, base64
                # Try to parse as JSON first (some formats)
                decoded = json.loads(value)
                if isinstance(decoded, dict) and "access_token" in decoded:
                    return decoded["access_token"]
                if isinstance(decoded, list) and len(decoded) > 0:
                    # Supabase SSR format: array with token parts
                    token_str = "".join(decoded) if isinstance(decoded[0], str) else value
                    try:
                        inner = json.loads(token_str)
                        if isinstance(inner, dict) and "access_token" in inner:
                            return inner["access_token"]
                    except (json.JSONDecodeError, TypeError):
                        pass
            except (json.JSONDecodeError, TypeError):
                # It might be the raw JWT itself
                if value.count(".") == 2:
                    return value
    return None
