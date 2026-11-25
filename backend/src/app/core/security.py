from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

from app.core.config import settings

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"
TOKEN_TYPE_PASSWORD_RESET = "password_reset"

password_hasher = PasswordHash.recommended()

# Precomputed hash used to equalise response timing when a username does not exist.
DUMMY_PASSWORD_HASH = password_hasher.hash("dummypassword")


def hash_password(password: str) -> str:
    """Hash a plain-text password using Argon2."""
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a stored password hash."""
    try:
        return password_hasher.verify(plain_password, hashed_password)
    except UnknownHashError:
        return False


def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + expires_delta

    to_encode: dict[str, Any] = {}
    if extra_claims:
        to_encode.update(extra_claims)
    to_encode.update(
        {
            "sub": subject,
            "type": token_type,
            "jti": secrets.token_urlsafe(16),
            "iat": now,
            "exp": expire,
        }
    )

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token for the given subject (username)."""
    delta = (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return _create_token(
        subject=subject,
        token_type=TOKEN_TYPE_ACCESS,
        expires_delta=delta,
        extra_claims=extra_claims,
    )


def create_refresh_token(
    subject: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT refresh token for the given subject (username)."""
    delta = (
        expires_delta
        if expires_delta is not None
        else timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    return _create_token(
        subject=subject,
        token_type=TOKEN_TYPE_REFRESH,
        expires_delta=delta,
    )


def password_fingerprint(password_hash: str) -> str:
    """Short fixed-length fingerprint of a password hash to invalidate reset tokens on reuse."""
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:16]


def create_password_reset_token(
    subject: str,
    password_hash: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a short-lived signed JWT for resetting the user's password."""
    delta = (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    )
    return _create_token(
        subject=subject,
        token_type=TOKEN_TYPE_PASSWORD_RESET,
        expires_delta=delta,
        extra_claims={"pwd_fp": password_fingerprint(password_hash)},
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a signed JWT token."""
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
