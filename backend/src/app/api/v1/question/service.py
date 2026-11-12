import re
from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.v1.question.schemas import (
    QuestionCreateRequest,
    QuestionOptionCreateRequest,
    QuestionOptionResponse,
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


def get_subject_prefix(subject_name: str | None) -> str:
    if not subject_name:
        return "QUE"
    words = [w for w in re.split(r"[^A-Za-z0-9]+", subject_name.strip()) if w]
    if len(words) >= 3:
        return "".join(w[0] for w in words[:3]).upper()
    cleaned = re.sub(r"[^A-Za-z0-9]", "", subject_name).upper()
    return (cleaned[:3] or "QUE").ljust(3, "X")


def format_question_code(subject_name: str | None, sequence_number: int) -> str:
    prefix = get_subject_prefix(subject_name)
    return f"{prefix}-{sequence_number:03d}"


def get_subject_or_404(db: Session, subject_id: int) -> Subject:
    subject = db.scalar(select(Subject).where(Subject.subject_id == subject_id))
    if subject is None:
        raise HTTPException(status_code=404, detail=SUBJECT_NOT_FOUND_DETAIL)
    return subject


def get_question_or_404(db: Session, question_id: int) -> Question:
    question = db.scalar(
        select(Question)
        .options(
            selectinload(Question.options),
            selectinload(Question.subject),
            selectinload(Question.test).selectinload(Test.subject),
        )
        .where(Question.question_id == question_id)
    )
    if question is None:
        raise HTTPException(status_code=404, detail=QUESTION_NOT_FOUND_DETAIL)
    return question


def resolve_question_subject(question: Question) -> Subject | None:
    if question.subject is not None:
        return question.subject
    if question.test is not None and question.test.subject is not None:
        return question.test.subject
    return None


def compute_question_sequence(db: Session, question: Question, subject: Subject | None) -> int:
    if subject is None:
        return question.question_id
    count = db.scalar(
        select(func.count(Question.question_id)).where(
            or_(
                Question.subject_id == subject.subject_id,
                Question.test.has(Test.subject_id == subject.subject_id),
            ),
            Question.question_id <= question.question_id,
        )
    )
    return count or 1


def to_question_response(
    question: Question,
    sequence_number: int,
    subject_name: str | None,
) -> QuestionResponse:
    return QuestionResponse(
        question_id=question.question_id,
        question_code=format_question_code(subject_name, sequence_number),
        subject_id=question.subject_id,
        test_id=question.test_id,
        question_text=question.question_text,
        options=[
            QuestionOptionResponse.model_validate(opt)
            for opt in question.options
        ],
    )


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
    subject = get_subject_or_404(db, request.subject_id)

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

    loaded = get_question_or_404(db, new_question.question_id)
    seq = compute_question_sequence(db, loaded, subject)
    return to_question_response(loaded, seq, subject.subject_name)


def get_questions(db: Session, subject_id: int | None = None) -> list[QuestionResponse]:
    stmt = (
        select(Question)
        .options(
            selectinload(Question.options),
            selectinload(Question.subject),
            selectinload(Question.test).selectinload(Test.subject),
        )
        .order_by(Question.question_id.asc())
    )

    target_subject: Subject | None = None
    if subject_id is not None:
        target_subject = get_subject_or_404(db, subject_id)
        stmt = stmt.where(
            or_(
                Question.subject_id == subject_id,
                Question.test.has(Test.subject_id == subject_id),
            )
        )

    questions = list(db.scalars(stmt).all())

    if target_subject is not None:
        return [
            to_question_response(q, idx + 1, target_subject.subject_name)
            for idx, q in enumerate(questions)
        ]

    subject_counters: dict[int | None, int] = {}
    responses: list[QuestionResponse] = []
    for q in questions:
        subj = resolve_question_subject(q)
        subj_key = subj.subject_id if subj else None
        subject_counters[subj_key] = subject_counters.get(subj_key, 0) + 1
        responses.append(
            to_question_response(
                q,
                subject_counters[subj_key],
                subj.subject_name if subj else None,
            )
        )
    return responses


def get_question(db: Session, question_id: int) -> QuestionResponse:
    question = get_question_or_404(db, question_id)
    subj = resolve_question_subject(question)
    seq = compute_question_sequence(db, question, subj)
    return to_question_response(question, seq, subj.subject_name if subj else None)


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
    loaded = get_question_or_404(db, question_id)
    subj = resolve_question_subject(loaded)
    seq = compute_question_sequence(db, loaded, subj)
    return to_question_response(loaded, seq, subj.subject_name if subj else None)


def delete_question(db: Session, question_id: int) -> None:
    question = get_question_or_404(db, question_id)
    for existing_option in list(question.options):
        db.delete(existing_option)
    db.delete(question)
    db.commit()
