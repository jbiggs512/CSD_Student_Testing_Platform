from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_db, require_roles
from app.api.v1.student import schemas
from app.api.v1.student import service

from app.db.models import User
from app.enums import UserRole

router = APIRouter()

@router.get("/outstandingTests/{student_id}")
def get_test(
    db: Annotated[Session, Depends(get_db)],
     _: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
    student_id: int,
) -> list[schemas.OutstandingTestResponse]:
    """Get outstanding tests by student ID"""
    return service.get_outstanding_tests(db, student_id)