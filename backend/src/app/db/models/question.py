from sqlalchemy import ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Question(Base):
    __tablename__ = "questions"

    __table_args__ = (
        Index("idx_questions_test_id", "test_id"),
    )

    question_id: Mapped[int] = mapped_column(primary_key=True)

    test_id: Mapped[int] = mapped_column(
        ForeignKey("tests.test_id", ondelete="RESTRICT"),
        nullable=False,
    )

    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    test: Mapped["Test"] = relationship(
        back_populates="questions",
    )
