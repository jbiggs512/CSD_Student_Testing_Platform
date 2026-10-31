# Business logic for auth. Keep routes thin, put the real work here.

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.v1.auth.schemas import TokenResponse
from app.api.v1.user.schemas import UserResponse
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    create_access_token,
    verify_password,
)
from app.db.models import User
from app.enums import AccountStatus


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

    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(user)

    return user


def login_user(db: Session, username: str, password: str) -> TokenResponse:
    """Authenticate a user and issue a signed JWT access token."""
    user = authenticate_user(db, username, password)
    access_token = create_access_token(
        subject=user.username,
        extra_claims={
            "user_id": user.user_id,
            "role": user.role.role_name,
        },
    )
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
