from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from typing import Annotated

from app.api.deps import get_db
from app.api.v1.test import schemas
from app.api.v1.test import service

router = APIRouter()

@router.get("/{test_id}", response_model=schemas.TestResponse)
def get_test(
    test_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> schemas.TestResponse:
    """Get test details by test ID."""
    return service.get_test_data(db, test_id)