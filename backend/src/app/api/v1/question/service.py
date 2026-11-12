import re
from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.v1.question.schemas import (
    QuestionBulkCreateRequest,
    QuestionBulkCreateResponse,
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
BULK_EMPTY_DETAIL = "At least one question is required."
MAX_QUESTION_LENGTH = 2000
MAX_OPTION_LENGTH = 500
BULK_EMPTY_DETAIL = "At least one question is required."
MAX_QUESTION_LENGTH = 2000
MAX_OPTION_LENGTH = 500

_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_SCRIPT_BLOCK_RE = re.compile(r"<script\b[^>]*>[\s\S]*?</script>", re.IGNORECASE)
_DANGEROUS_TAG_RE = re.compile(
    r"</?(?:iframe|object|embed|style|svg|math|link|meta|base)\b[^>]*>",
    re.IGNORECASE,
)


def sanitize_text(value: str) -> str:
    """Strip control characters and dangerous HTML/script blocks, then trim."""
    cleaned = _CONTROL_CHARS_RE.sub("", value)
    cleaned = _SCRIPT_BLOCK_RE.sub("", cleaned)
    cleaned = _DANGEROUS_TAG_RE.sub("", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def get_subject_prefix(subject_name: str | None) -> str:
    if not subject_name:
        return "QUE"
    words = [w for w in re.split(r"[^A-Za-z0-9]+", subject_name.strip()) if w]
    if len(words) >= 3:
        return "".join(w[0] for w in words[:3]).upper()
    cleaned = re.sub(r"[^A-Za-z0-9]", "", subject_name).upper()
    return (cleaned[:3] or "QUE").ljust(3, "X")


def format_question_code(subject_name: str | None, question_id: int) -> str:
    prefix = get_subject_prefix(subject_name)
    return f"{prefix}-{question_id:03d}"


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


def to_question_response(
    question: Question,
    subject_name: str | None,
) -> QuestionResponse:
    return QuestionResponse(
        question_id=question.question_id,
        question_code=format_question_code(subject_name, question.question_id),
        subject_id=question.subject_id,
        test_id=question.test_id,
        question_text=question.question_text,
        options=[
            QuestionOptionResponse.model_validate(opt)
            for opt in question.options
        ],
    )


def validate_options(options: list[QuestionOptionCreateRequest]) -> list[tuple[str, bool]]:
    if len(options) != 4:
        raise HTTPException(status_code=400, detail=OPTIONS_COUNT_DETAIL)

    sanitized_options: list[tuple[str, bool]] = []
    for option in options:
        cleaned_option = sanitize_text(option.option_text)
        if not cleaned_option:
            raise HTTPException(status_code=400, detail=OPTION_TEXT_REQUIRED_DETAIL)
        if len(cleaned_option) > MAX_OPTION_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Answer options must be {MAX_OPTION_LENGTH} characters or fewer.",
            )
        sanitized_options.append((cleaned_option, option.is_correct))

    correct_count = sum(1 for _, is_correct in sanitized_options if is_correct)
    if correct_count != 1:
        raise HTTPException(status_code=400, detail=CORRECT_OPTION_COUNT_DETAIL)

    return sanitized_options


def create_question(db: Session, request: QuestionCreateRequest) -> QuestionResponse:
    subject = get_subject_or_404(db, request.subject_id)

    question_text = sanitize_text(request.question_text)
    if not question_text:
        raise HTTPException(status_code=400, detail=QUESTION_TEXT_REQUIRED_DETAIL)
    if len(question_text) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Question text must be {MAX_QUESTION_LENGTH} characters or fewer.",
        )

    sanitized_options = validate_options(request.options)

    new_question = Question(
        subject_id=request.subject_id,
        question_text=question_text,
    )
    db.add(new_question)
    db.flush()

    for option_text, is_correct in sanitized_options:
        db.add(
            QuestionOption(
                question_id=new_question.question_id,
                option_text=option_text,
                is_correct=is_correct,
            )
        )

    db.commit()
    db.refresh(new_question)

    loaded = get_question_or_404(db, new_question.question_id)
    return to_question_response(loaded, subject.subject_name)


def bulk_create_questions(
    db: Session,
    request: QuestionBulkCreateRequest,
) -> QuestionBulkCreateResponse:
    subject = get_subject_or_404(db, request.subject_id)

    if not request.questions:
        raise HTTPException(status_code=400, detail=BULK_EMPTY_DETAIL)

    validated_items: list[tuple[str, list[tuple[str, bool]]]] = []
    for index, item in enumerate(request.questions, start=1):
        cleaned_text = sanitize_text(item.question_text)
        if not cleaned_text:
            raise HTTPException(
                status_code=400,
                detail=f"Question {index}: {QUESTION_TEXT_REQUIRED_DETAIL}",
            )
        if len(cleaned_text) > MAX_QUESTION_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Question {index}: Question text must be {MAX_QUESTION_LENGTH} characters or fewer.",
            )
        try:
            sanitized_options = validate_options(item.options)
        except HTTPException as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail=f"Question {index}: {exc.detail}",
            ) from exc
        validated_items.append((cleaned_text, sanitized_options))

    created_ids: list[int] = []
    for cleaned_text, sanitized_options in validated_items:
        new_question = Question(
            subject_id=request.subject_id,
            question_text=cleaned_text,
        )
        db.add(new_question)
        db.flush()
        created_ids.append(new_question.question_id)

        for option_text, is_correct in sanitized_options:
            db.add(
                QuestionOption(
                    question_id=new_question.question_id,
                    option_text=option_text,
                    is_correct=is_correct,
                )
            )

    db.commit()

    created_questions = list(
        db.scalars(
            select(Question)
            .options(selectinload(Question.options))
            .where(Question.question_id.in_(created_ids))
            .order_by(Question.question_id.asc())
        ).all()
    )

    responses = [
        to_question_response(q, subject.subject_name)
        for q in created_questions
    ]
    return QuestionBulkCreateResponse(
        created_count=len(responses),
        questions=responses,
    )


def bulk_create_questions(
    db: Session,
    request: QuestionBulkCreateRequest,
) -> QuestionBulkCreateResponse:
    subject = get_subject_or_404(db, request.subject_id)

    if not request.questions:
        raise HTTPException(status_code=400, detail=BULK_EMPTY_DETAIL)

    validated_items: list[tuple[str, list[tuple[str, bool]]]] = []
    for index, item in enumerate(request.questions, start=1):
        cleaned_text = sanitize_text(item.question_text)
        if not cleaned_text:
            raise HTTPException(
                status_code=400,
                detail=f"Question {index}: {QUESTION_TEXT_REQUIRED_DETAIL}",
            )
        if len(cleaned_text) > MAX_QUESTION_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Question {index}: Question text must be {MAX_QUESTION_LENGTH} characters or fewer.",
            )
        try:
            sanitized_options = validate_options(item.options)
        except HTTPException as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail=f"Question {index}: {exc.detail}",
            ) from exc
        validated_items.append((cleaned_text, sanitized_options))

    created_ids: list[int] = []
    for cleaned_text, sanitized_options in validated_items:
        new_question = Question(
            subject_id=request.subject_id,
            question_text=cleaned_text,
        )
        db.add(new_question)
        db.flush()
        created_ids.append(new_question.question_id)

        for option_text, is_correct in sanitized_options:
            db.add(
                QuestionOption(
                    question_id=new_question.question_id,
                    option_text=option_text,
                    is_correct=is_correct,
                )
            )

    db.commit()

    created_questions = list(
        db.scalars(
            select(Question)
            .options(selectinload(Question.options))
            .where(Question.question_id.in_(created_ids))
            .order_by(Question.question_id.asc())
        ).all()
    )

    responses = [
        to_question_response(q, subject.subject_name)
        for q in created_questions
    ]
    return QuestionBulkCreateResponse(
        created_count=len(responses),
        questions=responses,
    )


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
            to_question_response(q, target_subject.subject_name)
            for q in questions
        ]

    responses: list[QuestionResponse] = []
    for q in questions:
        subj = resolve_question_subject(q)
        responses.append(
            to_question_response(
                q,
                subj.subject_name if subj else None,
            )
        )
    return responses


def get_question(db: Session, question_id: int) -> QuestionResponse:
    question = get_question_or_404(db, question_id)
    subj = resolve_question_subject(question)
    return to_question_response(question, subj.subject_name if subj else None)


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
        cleaned_text = sanitize_text(request.question_text)
        if not cleaned_text:
            raise HTTPException(status_code=400, detail=QUESTION_TEXT_REQUIRED_DETAIL)
        if len(cleaned_text) > MAX_QUESTION_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Question text must be {MAX_QUESTION_LENGTH} characters or fewer.",
            )
        question.question_text = cleaned_text

    if request.options is not None:
        sanitized_options = validate_options(request.options)
        for existing_option in list(question.options):
            db.delete(existing_option)
        db.flush()

        for option_text, is_correct in sanitized_options:
            db.add(
                QuestionOption(
                    question_id=question.question_id,
                    option_text=option_text,
                    is_correct=is_correct,
                )
            )

    db.commit()
    db.expire(question)
    loaded = get_question_or_404(db, question_id)
    subj = resolve_question_subject(loaded)
    return to_question_response(loaded, subj.subject_name if subj else None)


def delete_question(db: Session, question_id: int) -> None:
    question = get_question_or_404(db, question_id)
    for existing_option in list(question.options):
        db.delete(existing_option)
    db.delete(question)
    db.commit()
