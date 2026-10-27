from sqlalchemy import Column, ForeignKey, Table

from app.db.base import Base


user_courses = Table(
    "user_courses",
    Base.metadata,
    Column(
        "user_id",
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "course_id",
        ForeignKey("courses.course_id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
