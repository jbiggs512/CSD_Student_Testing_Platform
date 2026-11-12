from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.v1.question.schemas import (
    QuestionCreateRequest,
    QuestionOptionCreateRequest,
    QuestionResponse,
    QuestionUpdateRequest,
)
from app.db.models import Question, QuestionOption, Subject, Test

QUESTION_NOT_FOUND_DETAIL = "Question not found."
SUBJECT_NOT_FOUND_DETAIL = "Subject not found."
QUESTION_TEXT_REQUIRED_DETAIL = "Question text is required."
OPTIONS_COUNT_DETAIL = "A question must have exactly 4 options."
OPTION_TEXT_REQUIRED_DETAIL = "All answer options must have text."
CORRECT_OPTION_COUNT_DETAIL = "Exactly one option must be marked as the correct answer."


def get_subject_or_404(db: Session, subject_id: int) -> Subject:
    subject = db.scalar(select(Subject).where(Subject.subject_id == subject_id))
    if subject is None:
        raise HTTPException(status_code=404, detail=SUBJECT_NOT_FOUND_DETAIL)
    return subject


def get_question_or_404(db: Session, question_id: int) -> Question:
    question = db.scalar(
        select(Question)
        .options(selectinload(Question.options))
        .where(Question.question_id == question_id)
    )
    if question is None:
        raise HTTPException(status_code=404, detail=QUESTION_NOT_FOUND_DETAIL)
    return question


def validate_options(options: list[QuestionOptionCreateRequest]) -> None:
    if len(options) != 4:
        raise HTTPException(status_code=400, detail=OPTIONS_COUNT_DETAIL)

    for option in options:
        if not option.option_text or not option.option_text.strip():
            raise HTTPException(status_code=400, detail=OPTION_TEXT_REQUIRED_DETAIL)

    correct_count = sum(1 for option in options if option.is_correct)
    if correct_count != 1:
        raise HTTPException(status_code=400, detail=CORRECT_OPTION_COUNT_DETAIL)


def create_question(db: Session, request: QuestionCreateRequest) -> QuestionResponse:
    get_subject_or_404(db, request.subject_id)

    question_text = request.question_text.strip()
    if not question_text:
        raise HTTPException(status_code=400, detail=QUESTION_TEXT_REQUIRED_DETAIL)

    validate_options(request.options)

    new_question = Question(
        subject_id=request.subject_id,
        question_text=question_text,
    )
    db.add(new_question)
    db.flush()

    for opt in request.options:
        db.add(
            QuestionOption(
                question_id=new_question.question_id,
                option_text=opt.option_text.strip(),
                is_correct=opt.is_correct,
            )
        )

    db.commit()
    db.refresh(new_question)

    return get_question_or_404(db, new_question.question_id)


def get_questions(db: Session, subject_id: int | None = None) -> list[QuestionResponse]:
    stmt = (
        select(Question)
        .options(selectinload(Question.options))
        .order_by(Question.question_id.asc())
    )

    if subject_id is not None:
        get_subject_or_404(db, subject_id)
        stmt = stmt.where(
            or_(
                Question.subject_id == subject_id,
                Question.test.has(Test.subject_id == subject_id),
            )
        )

    return list(db.scalars(stmt).all())


def get_question(db: Session, question_id: int) -> QuestionResponse:
    return get_question_or_404(db, question_id)


def update_question(
    db: Session,
    question_id: int,
    request: QuestionUpdateRequest,
) -> QuestionResponse:
    question = get_question_or_404(db, question_id)

    if request.subject_id is not None:
        get_subject_or_404(db, request.subject_id)
        question.subject_id = request.subject_id

    if request.question_text is not None:
        cleaned_text = request.question_text.strip()
        if not cleaned_text:
            raise HTTPException(status_code=400, detail=QUESTION_TEXT_REQUIRED_DETAIL)
        question.question_text = cleaned_text

    if request.options is not None:
        validate_options(request.options)
        for existing_option in list(question.options):
            db.delete(existing_option)
        db.flush()

        for opt in request.options:
            db.add(
                QuestionOption(
                    question_id=question.question_id,
                    option_text=opt.option_text.strip(),
                    is_correct=opt.is_correct,
                )
            )

    db.commit()
    db.expire(question)
    return get_question_or_404(db, question_id)


def delete_question(db: Session, question_id: int) -> None:
    question = get_question_or_404(db, question_id)
    for existing_option in list(question.options):
        db.delete(existing_option)
    db.delete(question)
    db.commit()
