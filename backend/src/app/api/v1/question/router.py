from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.api.v1.question import schemas, service
from app.db.models import User
from app.enums import UserRole

router = APIRouter()


@router.post("", status_code=201)
def create_question(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
    request: schemas.QuestionCreateRequest,
) -> schemas.QuestionResponse:
    return service.create_question(db, request)


@router.post("/bulk", status_code=201)
def bulk_create_questions(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
    request: schemas.QuestionBulkCreateRequest,
) -> schemas.QuestionBulkCreateResponse:
    return service.bulk_create_questions(db, request)


@router.get("")
def get_questions(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
    subject_id: Annotated[int | None, Query()] = None,
) -> list[schemas.QuestionResponse]:
    return service.get_questions(db, subject_id)


@router.get("/{question_id}")
def get_question(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
    question_id: int,
) -> schemas.QuestionResponse:
    return service.get_question(db, question_id)


@router.patch("/{question_id}")
def update_question(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
    question_id: int,
    request: schemas.QuestionUpdateRequest,
) -> schemas.QuestionResponse:
    return service.update_question(db, question_id, request)


@router.delete("/{question_id}", status_code=204)
def delete_question(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
    question_id: int,
) -> None:
    service.delete_question(db, question_id)
