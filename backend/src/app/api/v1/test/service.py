from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException

from app.db.models import Test, User, Subject, Course, TestAttempt, Question, QuestionOption
from app.api.v1.question.service import sanitize_text
from app.api.v1.test.schemas import (
    LecturerTestResponse,
    QuestionOptionResponse,
    QuestionResponse,
    TestAnswerSubmission,
    TestAttemptCreateRequest,
    TestAttemptResponse,
    TestCreateRequest,
    TestResponse,
)
from app.enums import SubjectStatus

SUBJECT_NOT_FOUND_DETAIL = "Subject not found."
SUBJECT_DISABLED_DETAIL = "Tests cannot be created for a disabled subject."
TEST_NAME_REQUIRED_DETAIL = "Test name is required."
TEST_ALREADY_EXISTS_DETAIL = "A test with this name already exists for this subject."
EMPTY_POOL_DETAIL = "This subject has no questions in its question pool."


def _subject_pool_filter(subject_id: int):
    return or_(
        Question.subject_id == subject_id,
        Question.test.has(Test.subject_id == subject_id),
    )


def count_subject_pool(db: Session, subject_id: int) -> int:
    return db.scalar(
        select(func.count(Question.question_id)).where(
            _subject_pool_filter(subject_id)
        )
    ) or 0


def sample_subject_pool_questions(
    db: Session,
    subject_id: int,
    limit: int,
) -> list[Question]:
    return list(
        db.scalars(
            select(Question)
            .options(selectinload(Question.options))
            .where(_subject_pool_filter(subject_id))
            .order_by(func.random())
            .limit(limit)
        ).all()
    )


def to_lecturer_test_response(test: Test, pool_size: int) -> LecturerTestResponse:
    return LecturerTestResponse(
        test_id=test.test_id,
        test_name=test.test_name,
        description=test.description,
        subject_id=test.subject_id,
        subject_name=test.subject.subject_name,
        course_title=test.subject.course.course_title,
        time_limit_minutes=test.time_limit_minutes,
        questions_per_attempt=test.questions_per_attempt,
        pool_size=pool_size,
    )


def _validate_new_test(db: Session, request: TestCreateRequest) -> tuple[Subject, str, int]:
    subject = db.get(Subject, request.subject_id)
    if subject is None:
        raise HTTPException(status_code=404, detail=SUBJECT_NOT_FOUND_DETAIL)
    if subject.status != SubjectStatus.ACTIVE:
        raise HTTPException(status_code=400, detail=SUBJECT_DISABLED_DETAIL)

    test_name = sanitize_text(request.test_name)
    if not test_name:
        raise HTTPException(status_code=400, detail=TEST_NAME_REQUIRED_DETAIL)

    duplicate = db.scalar(
        select(Test.test_id).where(
            Test.subject_id == subject.subject_id,
            func.lower(Test.test_name) == test_name.lower(),
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=400, detail=TEST_ALREADY_EXISTS_DETAIL)

    pool_size = count_subject_pool(db, subject.subject_id)
    if pool_size == 0:
        raise HTTPException(status_code=400, detail=EMPTY_POOL_DETAIL)
    if request.questions_per_attempt > pool_size:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Questions per attempt ({request.questions_per_attempt}) cannot exceed "
                f"the subject's question pool size ({pool_size})."
            ),
        )

    return subject, test_name, pool_size


def create_test(db: Session, request: TestCreateRequest) -> LecturerTestResponse:
    subject, test_name, pool_size = _validate_new_test(db, request)

    description = sanitize_text(request.description) if request.description else ""

    new_test = Test(
        subject_id=subject.subject_id,
        test_name=test_name,
        description=description or None,
        time_limit_minutes=request.time_limit_minutes,
        questions_per_attempt=request.questions_per_attempt,
    )
    db.add(new_test)
    db.commit()
    db.refresh(new_test)

    return to_lecturer_test_response(new_test, pool_size)


def _ensure_student_can_access_test(
    db: Session,
    target_test_id: int,
    current_user: User,
) -> Test:
    test = db.get(Test, target_test_id)
    if test is None:
        raise HTTPException(
            status_code=404,
            detail=f"Test with ID '{target_test_id}' not found.",
        )

    test_user_check = db.scalar(
        select(Test)
        .join(Subject, Test.subject_id == Subject.subject_id)
        .join(Course, Subject.course_id == Course.course_id)
        .join(Course.users)
        .where(
            User.user_id == current_user.user_id,
            Test.test_id == target_test_id,
        )
    )
    if test_user_check is None:
        raise HTTPException(
            status_code=401,
            detail=f"User not allowed to access test with ID '{target_test_id}'.",
        )

    return test


def get_test_data(
    db: Session,
    target_test_id: int,
    current_user: User,
) -> TestResponse:
    test = _ensure_student_can_access_test(db, target_test_id, current_user)

    sampled_questions = sample_subject_pool_questions(
        db,
        test.subject_id,
        test.questions_per_attempt,
    )

    return TestResponse(
        test_id=test.test_id,
        course=test.subject.course.course_title,
        subject=test.subject.subject_name,
        test_name=test.test_name,
        description=test.description or "",
        timed=test.time_limit_minutes is not None and test.time_limit_minutes > 0,
        time_limit_minutes=test.time_limit_minutes,
        current_question=1,
        questions_per_attempt=test.questions_per_attempt,
        questions=[
            QuestionResponse(
                question_id=question.question_id,
                question_text=question.question_text,
                options=[
                    QuestionOptionResponse(
                        option_id=option.option_id,
                        option_text=option.option_text,
                    )
                    for option in question.options
                ],
            )
            for question in sampled_questions
        ],
    )


def _grade_attempt_answers(
    db: Session,
    subject_id: int,
    answers: list[TestAnswerSubmission],
) -> tuple[int, int]:
    selected_by_question: dict[int, int | None] = {}
    for answer in answers:
        selected_by_question.setdefault(answer.question_id, answer.selected_option_id)

    option_ids = [
        option_id
        for option_id in selected_by_question.values()
        if option_id is not None
    ]
    if not option_ids:
        return 0, 0

    rows = db.execute(
        select(
            QuestionOption.option_id,
            QuestionOption.question_id,
            QuestionOption.is_correct,
        )
        .join(Question, QuestionOption.question_id == Question.question_id)
        .where(
            QuestionOption.option_id.in_(option_ids),
            _subject_pool_filter(subject_id),
        )
    ).all()

    options_by_pair = {
        (row.question_id, row.option_id): row.is_correct
        for row in rows
    }

    raw_score = 0
    correct_questions = 0
    for question_id, option_id in selected_by_question.items():
        if option_id is None:
            continue
        is_correct = options_by_pair.get((question_id, option_id))
        if is_correct is None:
            continue
        if is_correct:
            raw_score += 30
            correct_questions += 1
        else:
            raw_score -= 10

    return max(0, raw_score), correct_questions


def save_test_attempt(
    db: Session,
    request: TestAttemptCreateRequest,
    current_user: User,
) -> TestAttemptResponse:
    test = _ensure_student_can_access_test(db, request.test_id, current_user)
    score, correct_questions = _grade_attempt_answers(
        db,
        test.subject_id,
        request.answers,
    )

    new_test_attempt = TestAttempt(
        test_id=test.test_id,
        user_id=current_user.user_id,
        started_at=request.started_at,
        completed_at=request.completed_at,
        score=score,
        total_questions=test.questions_per_attempt,
        correct_questions=correct_questions,
    )

    db.add(new_test_attempt)
    db.commit()
    db.refresh(new_test_attempt)

    return new_test_attempt
    
    