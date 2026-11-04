
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_current_user, get_db, require_roles
from app.api.v1.subject import schemas
from app.api.v1.subject import service

from app.db.models import User
from app.enums import UserRole

router = APIRouter()

@router.post("", response_model=schemas.SubjectResponse, status_code=201)
def create_subject(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    request: schemas.SubjectCreateRequest
) -> schemas.SubjectResponse:
    return service.create_subject(db, request)

@router.patch("/{subject_id}", response_model=schemas.SubjectResponse)
def update_subject(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    request: schemas.SubjectUpdateRequest,
    subject_id: int
) -> schemas.SubjectResponse:
    return service.update_subject(db, request, subject_id)

@router.get("/{subject_id}", response_model=schemas.SubjectResponse)
def get_subject(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
    subject_id: int,
) -> schemas.SubjectResponse:
    return service.get_subject(db, subject_id)

@router.get("", response_model=list[schemas.SubjectResponse])
def get_subjects(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)]
) -> list[schemas.SubjectResponse]:
    return service.get_subjects(db)

@router.delete("/{subject_id}", status_code=204)
def delete_subject(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    subject_id: int
) -> None:
    service.delete_subject(db, subject_id)
