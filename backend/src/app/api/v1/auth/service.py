# Business logic for auth. Keep routes thin, put the real work here.

from dataclasses import dataclass
from datetime import datetime, timezone

import jwt
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.v1.auth.schemas import TokenResponse
from app.api.v1.user.schemas import UserResponse
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.db.models import User
from app.enums import AccountStatus


@dataclass(frozen=True)
class AuthSessionResult:
    token_response: TokenResponse
    refresh_token: str


def _ensure_user_is_active(user: User) -> None:
    if user.account_status == AccountStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is pending approval.",
        )

    if user.account_status == AccountStatus.DISABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled.",
        )


def _issue_session_tokens(user: User) -> AuthSessionResult:
    access_token = create_access_token(
        subject=user.username,
        extra_claims={
            "user_id": user.user_id,
            "role": user.role.role_name,
        },
    )
    refresh_token = create_refresh_token(subject=user.username)
    return AuthSessionResult(
        token_response=TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        ),
        refresh_token=refresh_token,
    )


def authenticate_user(db: Session, username: str, password: str) -> User:
    """Verify username and password, check account status, and update last_login."""
    invalid_credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = db.scalar(
        select(User)
        .options(joinedload(User.role))
        .where(User.username == username)
    )

    if user is None:
        verify_password(password, DUMMY_PASSWORD_HASH)
        raise invalid_credentials_exception

    if not verify_password(password, user.password_hash):
        raise invalid_credentials_exception

    _ensure_user_is_active(user)

    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(user)

    return user


def login_user(db: Session, username: str, password: str) -> AuthSessionResult:
    """Authenticate a user and issue signed access and refresh JWTs."""
    user = authenticate_user(db, username, password)
    return _issue_session_tokens(user)


def refresh_user_session(db: Session, refresh_token: str | None) -> AuthSessionResult:
    """Validate a refresh JWT, verify account status, and rotate session tokens."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    invalid_refresh_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(refresh_token)
    except jwt.InvalidTokenError as exc:
        raise invalid_refresh_exception from exc

    if payload.get("type") != TOKEN_TYPE_REFRESH:
        raise invalid_refresh_exception

    username = payload.get("sub")
    if not isinstance(username, str) or not username:
        raise invalid_refresh_exception

    user = db.scalar(
        select(User)
        .options(joinedload(User.role))
        .where(User.username == username)
    )
    if user is None:
        raise invalid_refresh_exception

    _ensure_user_is_active(user)

    return _issue_session_tokens(user)
