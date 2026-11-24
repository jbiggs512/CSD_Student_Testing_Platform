from sqlalchemy.orm import Session
from fastapi import APIRouter, BackgroundTasks, Depends
from typing import Annotated

from app.api.deps import get_current_user, get_db, require_roles
from app.api.v1.user import emails, schemas, service
from app.db.models import User
from app.enums import AccountStatus, UserRole

router = APIRouter()

@router.post(
    "/lecturer",
    response_model=schemas.UserResponse,
    status_code=201,
)
def request_create_lecturer(
    lecturer: schemas.LecturerCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    return service.create_user(db, lecturer)


@router.get("/lecturer", response_model=list[schemas.UserResponse])
def request_get_lecturers(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    return service.get_lecturers(db)


@router.patch(
    "/lecturer/{username}",
    response_model=schemas.UserResponse,
)
def request_update_lecturer(
    username: str,
    changes: schemas.LecturerUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    return service.update_lecturer(db, username, changes)


@router.patch(
    "/lecturer/{username}/unlock",
    response_model=schemas.UserResponse,
)
def request_unlock_lecturer(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
):
    return service.unlock_lecturer(db, username)


@router.delete("/lecturer/{username}", status_code=204)
def request_delete_lecturer(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
) -> None:
    service.delete_lecturer(db, username)


@router.post("/student", response_model=schemas.UserResponse, status_code=201)
def request_create_student(
    student: schemas.StudentCreateRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
):
    created_user = service.create_user(db, student)
    if created_user.account_status == AccountStatus.PENDING:
        background_tasks.add_task(
            emails.send_registration_pending_email,
            to_email=created_user.email,
            first_name=created_user.first_name,
            username=created_user.username,
        )
    return created_user

@router.get("/student", response_model=list[schemas.UserResponse])
def request_get_students(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
):
    return service.get_students(db)

@router.patch("/student/{username}", response_model=schemas.UserResponse)
def request_update_student(
    username: str,
    changes: schemas.StudentUpdateRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
):
    return service.update_student(db, username, changes)

@router.patch("/student/{username}/approve", response_model=schemas.UserResponse)
def approve_student(
    username: str,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    approved_user = service.approve_student(db, username, current_user)
    background_tasks.add_task(
        emails.send_account_approved_email,
        to_email=approved_user.email,
        first_name=approved_user.first_name,
        username=approved_user.username,
    )
    return approved_user


@router.patch("/student/{username}/unlock", response_model=schemas.UserResponse)
def request_unlock_student(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
):
    return service.unlock_student(db, username)

@router.delete("/student/{username}", status_code=204)
def request_delete_student(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.LECTURER, UserRole.ADMIN))],
) -> None:
    service.delete_student(db, username)

@router.delete("/{username}", status_code=204)
def delete_user(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    service.delete_user(db, username, current_user)
