from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
    token_version: int | None = None,
) -> str:
    expire = _utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": _utcnow(),
        "type": "access",
    }
    if token_version is not None:
        payload["tv"] = token_version
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: str,
    jti: str | None = None,
    token_version: int | None = None,
) -> str:
    expire = _utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": _utcnow(),
        "type": "refresh",
    }
    if jti is not None:
        payload["jti"] = jti
    if token_version is not None:
        payload["tv"] = token_version
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_ws_ticket(subject: str, expires_seconds: int = 60) -> str:
    """Create a short-lived token for WebSocket handshakes (e.g. cross-domain)."""
    expire = _utcnow() + timedelta(seconds=expires_seconds)
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "iat": _utcnow(),
        "type": "ws_ticket",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
