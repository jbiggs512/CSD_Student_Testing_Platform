from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    __table_args__ = (
        CheckConstraint(
            "score IS NULL OR score >= 0",
            name="ck_test_attempts_score_nonnegative",
        ),
        CheckConstraint(
            "total_questions IS NULL OR total_questions > 0",
            name="ck_test_attempts_total_questions_positive",
        ),
        CheckConstraint(
            "score IS NULL OR total_questions IS NULL "
            "OR score <= total_questions",
            name="ck_test_attempts_score_within_total",
        ),
        CheckConstraint(
            "(score IS NULL AND total_questions IS NULL) "
            "OR (score IS NOT NULL AND total_questions IS NOT NULL)",
            name="ck_test_attempts_result_fields_together",
        ),
        CheckConstraint(
            "completed_at IS NULL OR "
            "(score IS NOT NULL AND total_questions IS NOT NULL)",
            name="ck_test_attempts_completed_has_result",
        ),
    )

    attempt_id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    test_id: Mapped[int] = mapped_column(
        ForeignKey("tests.test_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    started_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    completed_at: Mapped[DateTime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    total_questions: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    user: Mapped["User"] = relationship(
        back_populates="test_attempts",
    )

    test: Mapped["Test"] = relationship(
        back_populates="attempts",
    )
