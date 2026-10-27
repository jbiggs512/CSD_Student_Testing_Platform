from sqlalchemy import (
    Enum as SQLAlchemyEnum,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.enums import SubjectStatus


class Subject(Base):
    __tablename__ = "subjects"

    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "subject_name",
            name="uq_subjects_course_name",
        ),
        Index("idx_subjects_course_id", "course_id"),
    )

    subject_id: Mapped[int] = mapped_column(primary_key=True)

    subject_name: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    course_id: Mapped[int] = mapped_column(
        ForeignKey(
            "courses.course_id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    status: Mapped[SubjectStatus] = mapped_column(
        SQLAlchemyEnum(
            SubjectStatus,
            name="subject_status_enum",
            native_enum=False,
            create_constraint=True,
            validate_strings=True,
            values_callable=lambda enum_cls: [
                member.value for member in enum_cls
            ],
        ),
        nullable=False,
        default=SubjectStatus.ACTIVE,
        server_default=SubjectStatus.ACTIVE.value,
    )

    course: Mapped["Course"] = relationship(
        back_populates="subjects",
    )
