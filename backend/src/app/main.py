
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from typing import Annotated

from fastapi import Depends
from sqlalchemy import text, select
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import settings

# Database imports
from app.api.deps import get_db

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="Backend API for the CSD Student Testing Platform",
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

@app.get("/health/database")
def database_health(
    db: Annotated[Session, Depends(get_db)],
):
    db.execute(text("SELECT 1"))
    return {"database": "connected"}