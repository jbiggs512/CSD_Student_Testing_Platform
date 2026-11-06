from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.user import router as user_router
from app.api.v1.subject import router as subject_router
from app.api.v1.course import router as course_router
from app.api.v1.test import router as test_router

api_router = APIRouter()

api_router.include_router(auth_router.router, prefix="/auth", tags=["auth"])
api_router.include_router(user_router.router, prefix="/user", tags=["user"])
api_router.include_router(subject_router.router, prefix="/subject", tags=["subject"])
api_router.include_router(course_router.router, prefix="/course", tags=["course"])
api_router.include_router(test_router.router, prefix="/test", tags=["test"])
