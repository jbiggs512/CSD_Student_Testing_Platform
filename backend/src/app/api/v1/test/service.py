from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload
from fastapi import HTTPException

from app.db.models import Test, User, Subject, Course, TestAttempt, Question
from app.api.v1.question.service import sanitize_text
from app.api.v1.test.schemas import (
    LecturerTestResponse,
    QuestionOptionResponse,
    QuestionResponse,
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


def get_test_data(
    db: Session, 
    target_test_id: int,
    current_user: User
) -> TestResponse:
    
    # Fetch the test data from the database
    test = db.get(Test, target_test_id)

    if test is None:
        raise HTTPException(status_code=404, detail=f"Test with ID '{target_test_id}' not found.")

    # Check user is allowed to access test
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
            raise HTTPException(status_code=401, detail=f"User not allowed to access test with ID '{target_test_id}'.")

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
                        is_correct=option.is_correct,
                    )
                    for option in question.options
                ],
            )
            for question in sampled_questions
        ],
    )
    
def save_test_attempt(
    db: Session,
    request: TestAttemptCreateRequest,
    current_user: User
    ) -> TestAttemptResponse:
    
    new_test_attempt = TestAttempt(
        test_id=request.test_id,
        user_id=current_user.user_id,
        started_at=request.started_at,
        completed_at=request.completed_at,
        score=request.score,
        total_questions=request.total_questions,
        correct_questions=request.correct_questions
    )
    
    db.add(new_test_attempt)
    db.commit()
    db.refresh(new_test_attempt)
    
    return new_test_attempt
    
    