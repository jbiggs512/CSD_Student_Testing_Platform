from sqlalchemy import table, column, select, func, join
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.api.v1.student.schemas import OutstandingTestResponse, CompletedTestResponse, CohortRankResponse, SubjectResponse, LeaderboardEntry, LeaderboardResponse
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

    # Fetch the list of tests that the user has completed
    completed_tests = db.scalars(
        select(TestAttempt)
        .where(TestAttempt.user_id == student_id,
                TestAttempt.completed_at.isnot(None)
        )
    )

    # Return the results as completed test model instances
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
    # Find users first / default course
    if len(current_user.courses) >= 1:
            course_id = current_user.courses[0].course_id
    else:
        # Return 412 if user is not enrolled on any courses
        raise HTTPException(
            status_code=412,
            detail="You are not enrolled in any courses.",
        )
    
    # Find the best score for each user, per test, within the subject
    # This is so the user can only achieve one lot of points per test 
    # If they take multiple tests, only the best will count towards their overall score
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

    # Find and calculate the total score per enrolled active student (0 if no attempts)
    cohort_totals = (
        select(
            User.user_id,
            func.coalesce(func.sum(best_per_test.c.best_score), 0).label("total_score"),
        )
        .join(User.courses)  # Link table between user and courses
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

    # Rank the student results, and count the cohort size
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

    # If the current user couldn't be found in the data return 412
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
        # Return 412 error if the user is not enrolled in any courses
        raise HTTPException(
            status_code=412,
            detail="You are not enrolled in any courses.",
        )

def get_subjects(
    db: Session,
    current_user: User,
) -> list[SubjectResponse]:
    # Find users first / default course
    if len(current_user.courses) >= 1:
        course_id = current_user.courses[0].course_id
    else:
        # Return 412 if user is not enrolled on any courses
        raise HTTPException(
            status_code=412,
            detail="You are not enrolled in any courses.",
        )
    
    subjects = db.scalars(
        select(Subject)
        .where(Subject.course_id == course_id)
    )
    
     # Return the results as completed test model instances
    return [SubjectResponse(
        label=subject.subject_name,
        value=subject.subject_id
    ) for subject in subjects] 

def get_leaderboard(
    db: Session,
    current_user: User,
    subject_id: int
) -> list[LeaderboardResponse]:
    # Get the course id linked to the subject
    course_id = db.scalar(
        select(Subject.course_id)
        .where(Subject.subject_id == subject_id)
    )
    
    # Find the best score for each user, per test, within the subject
    best_per_test = (
        select(
            TestAttempt.user_id,
            TestAttempt.test_id,
            func.max(TestAttempt.score).label("best_score"),
            func.max(TestAttempt.correct_questions).label("correct_questions"),
            func.max(TestAttempt.total_questions).label("total_questions")
        )
        .join(Test, Test.test_id == TestAttempt.test_id)
        .join(Subject, Subject.subject_id == Test.subject_id)
        .where(
            Subject.subject_id == subject_id,
            TestAttempt.completed_at.is_not(None),
            TestAttempt.score.is_not(None),
        )
        .group_by(TestAttempt.user_id, TestAttempt.test_id)
        .subquery()
    )

    # Calculate average score per user for tests in this subject
    percentage_expr = (best_per_test.c.correct_questions / best_per_test.c.total_questions) * 100.0
    
    user_averages = (
        select(
            best_per_test.c.user_id,
            func.coalesce(func.avg(percentage_expr), 0.0).label("avg_score")
        )
        .group_by(best_per_test.c.user_id)
        .subquery()
    )

    # Find and calculate the total score per enrolled active student (0 if no attempts)
    cohort_totals = (
        select(
            User.user_id,
            func.coalesce(func.sum(best_per_test.c.best_score), 0).label("total_score"),
        )
        .join(User.courses) 
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

    # Rank the student results, and count the cohort size
    ranked = (
        select(
            cohort_totals.c.user_id,
            func.rank().over(order_by=cohort_totals.c.total_score.desc()).label("rank"),
            func.count().over().label("size"),
        )
        .subquery()
    )

    # Format name as: First Name + Last Initial (e.g., "John D.")
    formatted_name = func.concat(
        User.first_name, 
        " ", 
        func.substring(User.last_name, 1, 1), 
        "."
    ).label("formatted_name")

    # Main query to fetch user details, rank, points, and average percentage score
    main_query = (
        select(
            User.user_id,
            ranked.c.rank,
            formatted_name,
            func.coalesce(user_averages.c.avg_score, 0).label("avg_score"),
            cohort_totals.c.total_score.label("points"),
        )
        .join(ranked, ranked.c.user_id == User.user_id)
        .join(cohort_totals, cohort_totals.c.user_id == User.user_id)
        .outerjoin(user_averages, user_averages.c.user_id == User.user_id)
    )

    # Fetch top 5 students
    top_5_query = main_query.order_by(ranked.c.rank.asc()).limit(5)
    top_students_rows = db.execute(top_5_query).all()

    top_students = [
        LeaderboardEntry(
            user_id=row.user_id,
            rank=row.rank,
            name=row.formatted_name,
            avg_score=round(row.avg_score, 2),
            points=row.points
        )
        for row in top_students_rows
    ]

    # Check if current_user is in the top 5
    is_in_top_5 = any(student.user_id == current_user.user_id for student in top_students)

    # Fetch current user entry separately if they are outside top 5
    current_user_entry = None
    if not is_in_top_5:
        user_query = main_query.where(User.user_id == current_user.user_id)
        user_row = db.execute(user_query).first()
        if user_row:
            current_user_entry = LeaderboardEntry(
                user_id=user_row.user_id,
                rank=user_row.rank,
                name=user_row.formatted_name,
                avg_score=round(user_row.avg_score, 2),
                points=user_row.points
            )

    return LeaderboardResponse(
        top_students=top_students,
        current_user_entry=current_user_entry,
        is_in_top_5=is_in_top_5
    )