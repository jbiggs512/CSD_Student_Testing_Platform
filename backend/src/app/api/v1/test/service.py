from datetime import datetime, timedelta, timezone
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException

from app.db.models import (
    Course,
    Question,
    QuestionOption,
    Role,
    Subject,
    Test,
    TestAttempt,
    User,
)
from app.api.v1.question.service import sanitize_text
from app.api.v1.test.schemas import (
    LecturerTestResponse,
    QuestionOptionResponse,
    QuestionResponse,
    StudentTestAttemptItem,
    TestAnswerSubmission,
    TestAttemptCreateRequest,
    TestAttemptResponse,
    TestCreateRequest,
    TestManagementStatsResponse,
    TestResponse,
    TestResultsDetailResponse,
)
from app.enums import AccountStatus, SubjectStatus, UserRole

SUBJECT_NOT_FOUND_DETAIL = "Subject not found."
SUBJECT_DISABLED_DETAIL = "Tests cannot be created for a disabled subject."
TEST_NOT_FOUND_DETAIL = "Test not found."
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


def _completed_attempt_percentage(attempt: TestAttempt) -> float | None:
    if (
        attempt.completed_at is None
        or attempt.total_questions is None
        or attempt.total_questions <= 0
    ):
        return None
    correct = attempt.correct_questions or 0
    return round((correct / attempt.total_questions) * 100, 1)


def to_lecturer_test_response(
    test: Test,
    pool_size: int,
    attempt_count: int = 0,
    attempted_student_count: int = 0,
    average_percentage: float | None = None,
) -> LecturerTestResponse:
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
        attempt_count=attempt_count,
        attempted_student_count=attempted_student_count,
        average_percentage=average_percentage,
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


def list_lecturer_tests(db: Session) -> list[LecturerTestResponse]:
    tests = db.scalars(
        select(Test)
        .options(
            selectinload(Test.subject).selectinload(Subject.course),
            selectinload(Test.attempts),
        )
        .order_by(Test.test_id.desc())
    ).all()

    pool_counts: dict[int, int] = {}
    responses: list[LecturerTestResponse] = []
    for test in tests:
        if test.subject_id not in pool_counts:
            pool_counts[test.subject_id] = count_subject_pool(db, test.subject_id)

        percentages = [
            pct
            for attempt in test.attempts
            if (pct := _completed_attempt_percentage(attempt)) is not None
        ]
        attempt_count = len(percentages)
        attempted_student_count = len({attempt.user_id for attempt in test.attempts})
        avg_pct = (
            round(sum(percentages) / attempt_count, 1)
            if attempt_count > 0
            else None
        )
        responses.append(
            to_lecturer_test_response(
                test,
                pool_counts[test.subject_id],
                attempt_count=attempt_count,
                attempted_student_count=attempted_student_count,
                average_percentage=avg_pct,
            )
        )

    return responses


def get_test_management_stats(db: Session) -> TestManagementStatsResponse:
    student_total = (
        db.scalar(
            select(func.count(User.user_id))
            .join(Role, User.role_id == Role.role_id)
            .where(
                Role.role_name == UserRole.STUDENT.value,
                User.account_status == AccountStatus.ACTIVE,
            )
        )
        or 0
    )

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    recent_attempts = db.execute(
        select(TestAttempt, Test.test_name)
        .join(Test, TestAttempt.test_id == Test.test_id)
        .where(
            TestAttempt.completed_at.isnot(None),
            TestAttempt.completed_at >= cutoff,
            TestAttempt.total_questions > 0,
        )
    ).all()

    all_percentages: list[float] = []
    percentages_by_test: dict[str, list[float]] = {}
    for attempt, test_name in recent_attempts:
        pct = _completed_attempt_percentage(attempt)
        if pct is None:
            continue
        all_percentages.append(pct)
        percentages_by_test.setdefault(test_name, []).append(pct)

    student_average = (
        round(sum(all_percentages) / len(all_percentages), 1)
        if all_percentages
        else None
    )
    weakest_test = (
        min(
            percentages_by_test,
            key=lambda name: (
                sum(percentages_by_test[name]) / len(percentages_by_test[name])
            ),
        )
        if percentages_by_test
        else None
    )

    return TestManagementStatsResponse(
        student_total=student_total,
        student_average_last_7_days=student_average,
        weakest_test_last_7_days=weakest_test,
    )


def get_test_results(db: Session, test_id: int) -> TestResultsDetailResponse:
    test = db.scalar(
        select(Test)
        .options(selectinload(Test.subject).selectinload(Subject.course))
        .where(Test.test_id == test_id)
    )
    if test is None:
        raise HTTPException(status_code=404, detail=TEST_NOT_FOUND_DETAIL)

    attempts = db.scalars(
        select(TestAttempt)
        .options(selectinload(TestAttempt.user))
        .where(
            TestAttempt.test_id == test_id,
            TestAttempt.completed_at.isnot(None),
            TestAttempt.total_questions.isnot(None),
            TestAttempt.total_questions > 0,
        )
        .order_by(TestAttempt.completed_at.desc())
    ).all()

    attempt_items: list[StudentTestAttemptItem] = []
    for attempt in attempts:
        pct = _completed_attempt_percentage(attempt)
        if pct is None or attempt.completed_at is None:
            continue
        attempt_items.append(
            StudentTestAttemptItem(
                attempt_id=attempt.attempt_id,
                user_id=attempt.user_id,
                username=attempt.user.username,
                student_name=f"{attempt.user.first_name} {attempt.user.last_name}".strip(),
                score=attempt.score or 0,
                correct_questions=attempt.correct_questions or 0,
                total_questions=attempt.total_questions or 0,
                percentage=pct,
                completed_at=attempt.completed_at,
            )
        )

    attempt_count = len(attempt_items)
    average_percentage = (
        round(sum(item.percentage for item in attempt_items) / attempt_count, 1)
        if attempt_count > 0
        else None
    )
    highest_score = (
        max(item.score for item in attempt_items) if attempt_count > 0 else None
    )
    lowest_score = (
        min(item.score for item in attempt_items) if attempt_count > 0 else None
    )

    return TestResultsDetailResponse(
        test_id=test.test_id,
        test_name=test.test_name,
        subject_name=test.subject.subject_name,
        course_title=test.subject.course.course_title,
        attempt_count=attempt_count,
        average_percentage=average_percentage,
        highest_score=highest_score,
        lowest_score=lowest_score,
        attempts=attempt_items,
    )


def delete_test(db: Session, test_id: int) -> None:
    test = db.get(Test, test_id)
    if test is None:
        raise HTTPException(status_code=404, detail=TEST_NOT_FOUND_DETAIL)

    # Clear legacy Question.test_id links (e.g. seeded questions) so ON DELETE RESTRICT does not block test deletion.
    linked_questions = db.scalars(
        select(Question).where(Question.test_id == test_id)
    ).all()
    for question in linked_questions:
        if question.subject_id is None:
            question.subject_id = test.subject_id
        question.test_id = None

    attempts = db.scalars(
        select(TestAttempt).where(TestAttempt.test_id == test_id)
    ).all()
    for attempt in attempts:
        db.delete(attempt)

    db.flush()
    db.delete(test)
    db.commit()


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
    
    