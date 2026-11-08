from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_db, require_roles, get_current_user
from app.api.v1.test import schemas
from app.api.v1.test import service
from app.db.models import User
from app.enums import UserRole

router = APIRouter()

@router.get("/{test_id}", response_model=schemas.TestResponse)
def get_test(
    test_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
     _: Annotated[User, Depends(require_roles(UserRole.STUDENT))]
) -> schemas.TestResponse:
    """Get test details by test ID."""
    return service.get_test_data(db, test_id, current_user)

@router.post("/attempt", status_code=201)
def create_test_attempt(
    db: Annotated[Session, Depends(get_db)],
    request: schemas.TestAttemptCreateRequest,
     current_user: Annotated[User, Depends(get_current_user)],
    _: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> schemas.TestAttemptResponse:
    return service.save_test_attempt(db, request, current_user)