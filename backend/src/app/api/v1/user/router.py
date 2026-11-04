from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_current_user, get_db
from app.api.v1.user import schemas
from app.api.v1.user import service
from app.db.models import User

router = APIRouter()

@router.post("/lecturer", response_model=schemas.UserResponse, status_code=201)
def request_create_lecturer(lecturer: schemas.LecturerCreateRequest,
                            db: Annotated[Session, Depends(get_db)]):
    return service.create_user(db, lecturer)

@router.post("/admin", response_model=schemas.UserResponse, status_code=201)
def request_create_admin(admin: schemas.AdminCreateRequest,
                         db: Annotated[Session, Depends(get_db)]):
    return service.create_user(db, admin)

@router.post("/student", response_model=schemas.UserResponse, status_code=201)
def request_create_student(student: schemas.StudentCreateRequest,
                           db: Annotated[Session, Depends(get_db)]):
    return service.create_user(db, student)

@router.patch("/student/{username}/approve", response_model=schemas.UserResponse)
def approve_student(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return service.approve_student(db, username, current_user)

@router.delete("/{username}", status_code=204)
def delete_user(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    service.delete_user(db, username, current_user)
