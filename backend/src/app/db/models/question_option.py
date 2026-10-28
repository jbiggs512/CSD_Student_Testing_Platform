from sqlalchemy import Boolean, ForeignKey, Index, Text, false
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QuestionOption(Base):
    __tablename__ = "question_options"

    __table_args__ = (
        Index("idx_question_options_question_id", "question_id"),
    )

    option_id: Mapped[int] = mapped_column(primary_key=True)

    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.question_id", ondelete="RESTRICT"),
        nullable=False,
    )

    option_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_correct: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
    )

    question: Mapped["Question"] = relationship(
        back_populates="options",
    )
