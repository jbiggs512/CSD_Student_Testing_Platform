from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.v1.course import schemas, service
from app.db.models import User

router = APIRouter()


@router.get("", response_model=list[schemas.CourseResponse])
def get_courses(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[schemas.CourseResponse]:
    return service.get_courses(db)
