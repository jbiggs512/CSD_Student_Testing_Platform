from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Question(Base):
    __tablename__ = "questions"

    __table_args__ = (
        Index("idx_questions_subject_id", "subject_id"),
        Index("idx_questions_test_id", "test_id"),
    )

    question_id: Mapped[int] = mapped_column(primary_key=True)

    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.subject_id", ondelete="RESTRICT"),
        nullable=True,
    )

    test_id: Mapped[int | None] = mapped_column(
        ForeignKey("tests.test_id", ondelete="RESTRICT"),
        nullable=True,
    )

    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    subject: Mapped["Subject | None"] = relationship(
        back_populates="questions",
    )

    test: Mapped["Test | None"] = relationship(
        back_populates="questions",
    )

    options: Mapped[list["QuestionOption"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
