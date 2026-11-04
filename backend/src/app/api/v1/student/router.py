from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_db
from app.api.v1.student import schemas
from app.api.v1.student import service

router = APIRouter()

@router.get("/outstandingTests/{studentId}")
def get_test(
    studentId: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[schemas.OutstandingTestResponse]:
    """Get outstanding tests by student ID"""
    return service.get_outstanding_tests(db, studentId)