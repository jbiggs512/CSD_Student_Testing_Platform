from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_db
from app.api.v1.user import schemas
from app.api.v1.user import service

router = APIRouter()

@router.post("/lecturer", response_model=schemas.UserResponse, status_code=201)
def request_create_lecturer(lecturer: schemas.LecturerCreateRequest,
                            db: Annotated[Session, Depends(get_db)]):
    return service.create_user(db, lecturer)

# TODO: Confirm method of authenticating/retrieving 'current_user'.
@router.delete("/{username}", status_code=204)
def delete_user(
    username: str,
    db: Annotated[Session, Depends(get_db)],
    # current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    service.delete_user(db, username)  # , current_user)