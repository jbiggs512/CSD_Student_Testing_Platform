from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_db, require_roles, get_current_user
from app.api.v1.student import schemas
from app.api.v1.student import service

from app.db.models import User
from app.enums import UserRole

router = APIRouter()

@router.get("/outstandingTests")
def get_test(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
     _: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> list[schemas.OutstandingTestResponse]:
    """Get outstanding tests by current student ID"""
    return service.get_outstanding_tests(db, current_user.user_id)

@router.get("/completedTests")
def get_test(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
     _: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> list[schemas.CompletedTestResponse]:
    """Get completed tests by current student ID"""
    return service.get_completed_tests(db, current_user.user_id)

@router.get("/cohortRank")
def get_test(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
     _: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> schemas.CohortRankResponse:
    """Get cohort rank for the current student"""
    return service.get_cohort_rank(db, current_user)