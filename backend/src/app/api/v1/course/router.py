from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.api.v1.course import schemas, service
from app.db.models import User
from app.enums import UserRole

router = APIRouter()


@router.post("", response_model=schemas.CourseResponse, status_code=201)
def create_course(
    request: schemas.CourseCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> schemas.CourseResponse:
    try:
        return service.create_course(db, request.course_title.strip())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.patch("/{course_id}", response_model=schemas.CourseResponse)
def update_course(
    course_id: int,
    request: schemas.CourseUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> schemas.CourseResponse:
    try:
        return service.update_course(db, course_id, request.course_title.strip())
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get("", response_model=list[schemas.CourseResponse])
def get_courses(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[schemas.CourseResponse]:
    return service.get_courses(db)
