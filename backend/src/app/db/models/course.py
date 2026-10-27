from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Course(Base):
    __tablename__ = "courses"

    course_id: Mapped[int] = mapped_column(primary_key=True)

    course_title: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
        unique=True,
    )

    subjects: Mapped[list["Subject"]] = relationship(
        back_populates="course",
        passive_deletes="all",
    )

    users: Mapped[list["User"]] = relationship(
        secondary="user_courses",
        back_populates="courses",
    )
