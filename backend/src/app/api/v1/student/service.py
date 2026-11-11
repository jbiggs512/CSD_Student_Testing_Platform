from sqlalchemy import table, column, select, func, join
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.api.v1.student.schemas import OutstandingTestResponse, CompletedTestResponse, CohortRankResponse
from app.db.models import TestAttempt, Test, Subject, Course, User, Role

def get_outstanding_tests(
    db: Session, 
    student_id: int
) -> list[OutstandingTestResponse]:
    
    # Find test IDs that the student has already completed
    completed_tests_subquery = (
        select(TestAttempt.test_id)
        .where(TestAttempt.user_id == student_id,
                TestAttempt.completed_at.isnot(None)
        )
    )

    # Get all tests for courses the student is enrolled in, excluding completed ones
    stmt = (
        select(Test)
        .join(Subject, Test.subject_id == Subject.subject_id)
        .join(Course, Subject.course_id == Course.course_id)
        .join(Course.users)
        .where(User.user_id == student_id,
            ~Test.test_id.in_(completed_tests_subquery)
        )
    )

    # Execute and fetch the list of outstanding test model instances
    outstanding_tests = db.scalars(stmt).all()

    return [OutstandingTestResponse(
                id=test.test_id,
                test_name=test.test_name,
                subject_name=test.subject.subject_name,
                description=test.description,
                questions_per_attempt=test.questions_per_attempt,
        ) for test in outstanding_tests] 
    
def get_completed_tests(
    db: Session, 
    student_id: int
) -> list[CompletedTestResponse]:

    # Execute and fetch the list of completed test model instances
    completed_tests = db.scalars(
        select(TestAttempt)
        .where(TestAttempt.user_id == student_id,
                TestAttempt.completed_at.isnot(None)
                )
    )

    return [CompletedTestResponse(
                id=attempt.test.test_id,
                test_name=attempt.test.test_name,
                score_percentage=(attempt.correct_questions/attempt.total_questions)*100,
                questions_correct=attempt.correct_questions,
                questions_total=attempt.total_questions,
                completed_date=attempt.completed_at.strftime("%d %B %Y"),
                score_points=attempt.score
        ) for attempt in completed_tests] 
    
def get_cohort_rank(
    db: Session,
    current_user: User,
):
    # Users first / default course
    if len(current_user.courses) >= 1:
            course_id = current_user.courses[0].course_id
    else:
        raise HTTPException(
            status_code=412,
            detail="You are not enrolled in any courses.",
        )
    
    # Best completed attempt per user per test, within this course
    best_per_test = (
        select(
            TestAttempt.user_id,
            TestAttempt.test_id,
            func.max(TestAttempt.score).label("best_score"),
        )
        .join(Test, Test.test_id == TestAttempt.test_id)
        .join(Subject, Subject.subject_id == Test.subject_id)
        .where(
            Subject.course_id == course_id,
            TestAttempt.completed_at.is_not(None),
            TestAttempt.score.is_not(None),
        )
        .group_by(TestAttempt.user_id, TestAttempt.test_id)
        .subquery()
    )

    # Total score per enrolled active student (0 if no attempts)
    cohort_totals = (
        select(
            User.user_id,
            func.coalesce(func.sum(best_per_test.c.best_score), 0).label("total_score"),
        )
        .join(User.courses)  # enrolment via user_courses
        .join(Role, Role.role_id == User.role_id)
        .outerjoin(best_per_test, best_per_test.c.user_id == User.user_id)
        .where(
            Course.course_id == course_id,
            User.account_status == "active",
            Role.role_name == "student",
        )
        .group_by(User.user_id)
        .subquery()
    )

    # Rank everyone, and count the cohort size
    ranked = (
        select(
            cohort_totals.c.user_id,
            func.rank().over(order_by=cohort_totals.c.total_score.desc()).label("rank"),
            func.count().over().label("size"),
        )
        .subquery()
    )

    # Find the current user's row
    row = db.execute(
        select(ranked.c.rank, ranked.c.size).where(
            ranked.c.user_id == current_user.user_id
        )
    ).first()

    if row is None:
        raise HTTPException(
            status_code=412,
            detail="Could not locate your rank within the cohort.",
        )

    return CohortRankResponse(rank=row.rank, size=row.size)

def get_course_title(
    current_user: User,
) -> str:
    # Users first / default course
    if len(current_user.courses) >= 1:
        return current_user.courses[0].course_title
    else:
        raise HTTPException(
            status_code=412,
            detail="You are not enrolled in any courses.",
        )