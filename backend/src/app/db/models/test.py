from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Test(Base):
    __tablename__ = "tests"

    __table_args__ = (
        CheckConstraint(
            "questions_per_attempt > 0",
            name="ck_tests_questions_per_attempt_positive",
        ),
        CheckConstraint(
            "time_limit_minutes IS NULL OR time_limit_minutes > 0",
            name="ck_tests_time_limit_positive",
        ),
    )

    test_id: Mapped[int] = mapped_column(primary_key=True)

    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.subject_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    test_name: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    questions_per_attempt: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
        server_default="10",
    )

    time_limit_minutes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    subject: Mapped["Subject"] = relationship(
        back_populates="tests",
    )

    questions: Mapped[list["Question"]] = relationship(
        back_populates="test",
        passive_deletes="all",
    )
