# Shared dependencies used across all API routes (auth checks, DB sessions, etc.)
# Example:
# def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
#     ...

from collections.abc import Generator

from sqlalchemy.orm import Session

from app.db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
