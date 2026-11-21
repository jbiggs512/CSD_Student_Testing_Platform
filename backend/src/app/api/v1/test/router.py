from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_db, require_roles, get_current_user
from app.api.v1.test import schemas
from app.api.v1.test import service
from app.db.models import User
from app.enums import UserRole

router = APIRouter()


@router.post("", status_code=201)
def create_test(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
    request: schemas.TestCreateRequest,
) -> schemas.LecturerTestResponse:
    """Create a new test that draws questions from a subject's question pool."""
    return service.create_test(db, request)


@router.get("")
def list_tests(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
) -> list[schemas.LecturerTestResponse]:
    """List all tests with subject pool sizes and student attempt summaries."""
    return service.list_lecturer_tests(db)


@router.get("/stats")
def get_test_management_stats(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
) -> schemas.TestManagementStatsResponse:
    """Get summary statistics for the lecturer test management dashboard."""
    return service.get_test_management_stats(db)


@router.get("/{test_id}/results")
def get_test_results(
    test_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
) -> schemas.TestResultsDetailResponse:
    """Get detailed student attempt results for a specific test."""
    return service.get_test_results(db, test_id)


@router.delete("/{test_id}", status_code=204)
def delete_test(
    test_id: int,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
) -> None:
    """Delete a test and its associated student attempts."""
    service.delete_test(db, test_id)


@router.get("/{test_id}", response_model=schemas.TestResponse)
def get_test(
    test_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))]
) -> schemas.TestResponse:
    """Get test details by test ID."""
    return service.get_test_data(db, test_id, current_user)

@router.post("/attempt", status_code=201)
def create_test_attempt(
    db: Annotated[Session, Depends(get_db)],
    request: schemas.TestAttemptCreateRequest,
    current_user: Annotated[User, Depends(require_roles(UserRole.STUDENT))],
) -> schemas.TestAttemptResponse:
    """Create new test attempt record."""
    return service.save_test_attempt(db, request, current_user)