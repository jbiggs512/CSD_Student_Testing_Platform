# Auth route handlers. Wire up requests to the service layer.

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.v1.auth import schemas, service
from app.api.v1.user.schemas import UserResponse
from app.core.config import settings
from app.db.models import User

router = APIRouter()

REFRESH_COOKIE_PATH = f"{settings.API_V1_STR}/auth"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_TOKEN_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(
    credentials: schemas.LoginRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.TokenResponse:
    """Authenticate with JSON credentials, set an HttpOnly refresh cookie, and return an access JWT."""
    result = service.login_user(db, credentials.username, credentials.password)
    _set_refresh_cookie(response, result.refresh_token)
    return result.token_response


@router.post("/token", response_model=schemas.TokenResponse)
def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.TokenResponse:
    """OAuth2 compatible form-encoded token login (used by Swagger UI Authorize)."""
    result = service.login_user(db, form_data.username, form_data.password)
    _set_refresh_cookie(response, result.refresh_token)
    return result.token_response


@router.post("/refresh", response_model=schemas.TokenResponse)
def refresh_access_token(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.TokenResponse:
    """Issue a new access JWT and rotate the HttpOnly refresh cookie."""
    refresh_token = request.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    result = service.refresh_user_session(db, refresh_token)
    _set_refresh_cookie(response, result.refresh_token)
    return result.token_response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> Response:
    """Clear the HttpOnly refresh token cookie."""
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    _clear_refresh_cookie(response)
    return response


@router.get("/me", response_model=UserResponse)
def read_current_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Return the profile of the currently authenticated user."""
    return current_user
