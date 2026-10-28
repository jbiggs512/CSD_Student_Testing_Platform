# Auth route handlers. Wire up requests to the service layer.
# Example:
# @router.post("/login", response_model=schemas.TokenResponse)
# def login(credentials: schemas.LoginRequest):
#     ...

from typing import Annotated

from app.api.deps import get_db
from app.api.v1.user import schemas
from app.api.v1.user import service
from fastapi import APIRouter

from sqlalchemy.orm import Session
from fastapi import Depends

router = APIRouter()

@router.post("/create/lecturer", response_model=schemas.UserResponse, status_code=201)
def request_create_lecturer(lecturer: schemas.LecturerCreateRequest,
                            db: Annotated[Session, Depends(get_db)]):
    try:
        return service.create_user(db, lecturer)
    # TODO: Is this necessary idk?
    except ValueError as e:
        return {"error": str(e)}
    
