from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.api.v1.course import schemas, service
from app.db.models import User
from app.enums import UserRole

router = APIRouter()


@router.post(
    "",
    status_code=201,
    responses={400: {"description": "A course with this title already exists."}},
)
def create_course(
    request: schemas.CourseCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> schemas.CourseResponse:
    return service.create_course(db, request.course_title.strip())


@router.patch(
    "/{course_id}",
    responses={
        400: {"description": "A course with this title already exists."},
        404: {"description": "Course not found."},
    },
)
def update_course(
    course_id: int,
    request: schemas.CourseUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> schemas.CourseResponse:
    return service.update_course(db, course_id, request.course_title.strip())


@router.get("")
def get_courses(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[schemas.CourseResponse]:
    return service.get_courses(db)
