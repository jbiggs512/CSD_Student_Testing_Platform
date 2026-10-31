# Auth route handlers. Wire up requests to the service layer.

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.v1.auth import schemas, service
from app.api.v1.user.schemas import UserResponse
from app.db.models import User

router = APIRouter()


@router.post("/login", response_model=schemas.TokenResponse)
def login(
    credentials: schemas.LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.TokenResponse:
    """Authenticate with JSON credentials (username and password) and return a JWT."""
    return service.login_user(db, credentials.username, credentials.password)


@router.post("/token", response_model=schemas.TokenResponse)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> schemas.TokenResponse:
    """OAuth2 compatible form-encoded token login."""
    return service.login_user(db, form_data.username, form_data.password)


@router.get("/me", response_model=UserResponse)
def read_current_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Return the profile of the currently authenticated user."""
    return current_user
