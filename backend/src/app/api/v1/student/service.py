from sqlalchemy import Float, Integer, cast, func, select, or_
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.api.v1.student.schemas import ( 
OutstandingTestResponse, 
CompletedTestResponse, 
CohortRankResponse, 
SubjectResponse, 
LeaderboardEntry, 
LeaderboardResponse, 
StatisticsResponse, 
ScoreResponse,
GradePoint,
GradesOverTimeResponse,
CohortComparisonResponse,
ScoreBand,
ScoreDistributionResponse)
from app.db.models import TestAttempt, Test, Subject, Course, User, Role

BANDS = [
    ("40–49", 40),
    ("50–59", 50),
    ("60–69", 60),
    ("70–79", 70),
    ("80–89", 80),
    ("90–100", 90),
]

# Shared subqueries / functions

def _get_subject(db: Session, subject_id: int):
    """Return (course_id, subject_name) or raise 404."""
    row = db.execute(
        select(Subject.course_id, Subject.subject_name).where(
            Subject.subject_id == subject_id
        )
    ).first()
    if row is None:
        raise HTTPException(
            status=404,
            detail="Subject not found")
    return row.course_id, row.subject_name

def _percentage_expr():
    """
    Users test score, expressed as a percentage
    """
    return (
        cast(TestAttempt.correct_questions, Float)
        / func.nullif(cast(TestAttempt.total_questions, Float), 0)
    ) * 100.0

def _format_name(first_name: str, last_name: str | None) -> str:
    """'John Doe' -> 'John D.' (done in Python so it behaves the same on any database)."""
    initial = f" {last_name[0]}." if last_name else ""
    return f"{first_name}{initial}"


def _to_entry(row) -> LeaderboardEntry:
    return LeaderboardEntry(
        user_id=row.user_id,
        rank=row.rank,
        name=_format_name(row.first_name, row.last_name),
        avg_score=round(float(row.avg_score), 2),  
        points=row.points,
    )

def _student_scores(course_id: int, subject_id: int):
    """
    Build the subquery to get one row per enrolled, active student who has 
    completed at least one test in this subject, with their average percentage 
    score for the subject. 
    """

    return (
        select(
            User.user_id,
            func.avg(_percentage_expr()).label("avg_score"),
        )
        .join(User.courses)
        .join(Role, Role.role_id == User.role_id)
        .join(TestAttempt, TestAttempt.user_id == User.user_id)
        .join(Test, Test.test_id == TestAttempt.test_id)
        .where(
            Course.course_id == course_id,
            Test.subject_id == subject_id,
            User.account_status == "active",
            Role.role_name == "student",
            TestAttempt.completed_at.is_not(None),
            TestAttempt.correct_questions.is_not(None),
        )
        .group_by(User.user_id)
        .having(func.avg(_percentage_expr()).is_not(None))
        .subquery()
    )

def _band_index(score: float) -> int:
    return max(4, min(int(score // 10), 9))

def _round(value: float | None) -> int | None:
    return 0 if value is None else round(value)

# Service functions

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
        .order_by(TestAttempt.completed_at.desc())
    )

    # Return the results as completed test model instances
    return [CompletedTestResponse(
                id=attempt.attempt_id,
                test_id=attempt.test.test_id,
                test_name=attempt.test.test_name,
                subject_name=attempt.test.subject.subject_name,
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
        # Return none if user is not enrolled on any courses, so that no content (204) is returned
        return None

    # Find and calculate the total score per enrolled active student (0 if no attempts)
    cohort_totals = (
        select(
            User.user_id,
            func.coalesce(func.sum(TestAttempt.score), 0).label("total_score"),
        )
        .join(User.courses)  # Link table between user and courses
        .join(Role, Role.role_id == User.role_id)
        .join(TestAttempt, TestAttempt.user_id == User.user_id)
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

    # If the current user couldn't be found in the data return no content
    if row is None:
        return None

    return CohortRankResponse(rank=row.rank, size=row.size)

def get_course_title(
    current_user: User,
) -> str:
    # Users first / default course
    if len(current_user.courses) >= 1:
        return current_user.courses[0].course_title

def get_subjects(
    db: Session,
    current_user: User,
) -> list[SubjectResponse] | None:
    # Find users first / default course
    if len(current_user.courses) >= 1:
        course_id = current_user.courses[0].course_id
    else:
        # Return none if user is not enrolled on any courses, so that no content (204) is returned
        return None
    
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
    subject_id: int,
) -> LeaderboardResponse:
    course_id, _ = _get_subject(db, subject_id)

    # Completed attempts for the passed subject
    subject_attempts = (
        select(
            TestAttempt.user_id,
            TestAttempt.score,
            _percentage_expr().label("percentage"),
        )
        .join(Test, Test.test_id == TestAttempt.test_id)
        .where(
            Test.subject_id == subject_id,
            TestAttempt.completed_at.is_not(None),
            TestAttempt.correct_questions.is_not(None),
        )
        .subquery()
    )

    # One row per enrolled, active student: total points and average percentage
    cohort = (
        select(
            User.user_id,
            func.coalesce(func.sum(subject_attempts.c.score), 0).label("points"),
            func.coalesce(func.avg(subject_attempts.c.percentage), 0.0).label("avg_score"),
        )
        .join(User.courses)
        .join(Role, Role.role_id == User.role_id)
        .outerjoin(subject_attempts, subject_attempts.c.user_id == User.user_id)
        .where(
            Course.course_id == course_id,
            User.account_status == "active",
            Role.role_name == "student",
        )
        .group_by(User.user_id)
        .subquery()
    )

    # Rank by points (tied students share a rank)
    ranked = select(
        cohort.c.user_id,
        cohort.c.points,
        cohort.c.avg_score,
        func.rank().over(order_by=cohort.c.points.desc()).label("rank"),
    ).subquery()
    
    rows = db.execute(
        select(
            ranked.c.user_id,
            ranked.c.rank,
            ranked.c.points,
            ranked.c.avg_score,
            User.first_name,
            User.last_name,
        )
        .join(User, User.user_id == ranked.c.user_id)
        .where(
            or_(
                ranked.c.rank <= 5,
                ranked.c.user_id == current_user.user_id,
            )
        )
        .order_by(ranked.c.rank, ranked.c.avg_score.desc(), ranked.c.user_id)
    ).all()

    top_rows = rows[:5]
    top_ids = {row.user_id for row in top_rows}
    is_in_top_5 = current_user.user_id in top_ids

    current_user_entry = None
    if not is_in_top_5:
        my_row = next((r for r in rows if r.user_id == current_user.user_id), None)
        if my_row is not None:
            current_user_entry = _to_entry(my_row)

    return LeaderboardResponse(
        top_students=[_to_entry(row) for row in top_rows],
        current_user_entry=current_user_entry,
        is_in_top_5=is_in_top_5,
    )
    
def get_statistics(
    db: Session,
    student_id: int,
) -> StatisticsResponse | None:
    
    # Get all of the users completed tests
    completed_tests = db.scalars(
        select(TestAttempt) 
        .where(
            TestAttempt.user_id == student_id,
            TestAttempt.completed_at.is_not(None),
            TestAttempt.score.is_not(None),
            TestAttempt.total_questions.is_not(None),
            TestAttempt.total_questions > 0,   
        )
    ).all()

    # Return none if the user has not yet completed any tests
    if not completed_tests:
        return None

    # Function to get the test attempt score as a percentage
    def percentage(attempt: TestAttempt) -> float:
        return attempt.correct_questions / attempt.total_questions * 100

    # Function to convert the test attempt into a score response model
    def to_score_response(attempt: TestAttempt) -> ScoreResponse:
        return ScoreResponse(
            score=round(percentage(attempt)),
            test_name=attempt.test.test_name,
            completed_date=attempt.completed_at.strftime("%-d %b %Y"),
        )

    # Get the best and worst scores as percentages from the list
    best = max(completed_tests, key=percentage)
    worst = min(completed_tests, key=percentage)

    # Get the average score as a percentage
    average_percentage = sum(percentage(a) for a in completed_tests) / len(completed_tests)

    # Return the calculated results as a statistics response model
    return StatisticsResponse(
        total_points=sum(a.score for a in completed_tests),
        average_score=round(average_percentage),
        best_score=to_score_response(best),
        worst_score=to_score_response(worst),
    )
    
def get_grades_over_time(
    db: Session,
    student_id: int,
) -> GradesOverTimeResponse | None:
    # Get all test attempts for the student
    attempts = db.scalars(
        select(TestAttempt) 
        .where(
            TestAttempt.user_id == student_id,
            TestAttempt.completed_at.is_not(None),
            TestAttempt.score.is_not(None),
            TestAttempt.total_questions.is_not(None),
            TestAttempt.total_questions > 0,
        )
        .order_by(TestAttempt.completed_at.asc())
    ).all()

    # Return none if there are no completed tests / attempts
    if not attempts:
        return None

    # Calculate percentage score for each attempt
    percentages = [a.correct_questions / a.total_questions * 100 for a in attempts]

    # Get the index of the best and worst scores in the percentages list
    best_index = max(range(len(percentages)), key=percentages.__getitem__)
    worst_index = min(range(len(percentages)), key=percentages.__getitem__)

    # Turn each attempt into a GradePoint model
    points = [
        GradePoint(
            completed_at=attempt.completed_at.isoformat(),
            percentage=round(pct),
            test_name=attempt.test.test_name,
            is_best=(i == best_index),
            is_worst=(i == worst_index),
        )
        for i, (attempt, pct) in enumerate(zip(attempts, percentages))
    ]

    # Return results as a GradesOverTimeResponse model
    return GradesOverTimeResponse(
        average=round(sum(percentages) / len(percentages)),
        points=points,
    )
    
def get_cohort_comparison(
    db: Session,
    current_user: User,
    subject_id: int,
) -> CohortComparisonResponse:
    course_id, subject_name = _get_subject(db, subject_id)
    student_scores = _student_scores(course_id, subject_id)

    # Whole cohort average
    cohort_avg = db.scalar(select(func.avg(student_scores.c.avg_score)))

    # Average of the five highest student scores
    top_scores = (
        select(student_scores.c.avg_score)
        .order_by(student_scores.c.avg_score.desc())
        .limit(5)
        .subquery()
    )
    top_avg = db.scalar(select(func.avg(top_scores.c.avg_score)))

    # Current user's own average (None if they haven't completed a test yet)
    user_avg = db.scalar(
        select(student_scores.c.avg_score).where(
            student_scores.c.user_id == current_user.user_id
        )
    )

    return CohortComparisonResponse(
        subject=subject_name,
        top5_average=_round(top_avg),
        user_average=_round(user_avg),
        cohort_average=_round(cohort_avg),
    )


def get_score_distribution(
    db: Session,
    current_user: User,
    subject_id: int,
) -> ScoreDistributionResponse:
    course_id, subject_name = _get_subject(db, subject_id)
    student_scores = _student_scores(course_id, subject_id)

    # Split each student average into the bands
    band_index = cast(
        func.least(
            func.greatest(func.floor(student_scores.c.avg_score / 10), 4),
            9,
        ),
        Integer,
    ).label("band_index")

    rows = db.execute(
        select(band_index, func.count().label("student_count")).group_by(band_index)
    ).all()
    counts = {row.band_index: row.student_count for row in rows}

    # Always return every band, including empty ones
    bands = [
        ScoreBand(band=label, count=counts.get(4 + i, 0))
        for i, (label, _) in enumerate(BANDS)
    ]

    # Current user's score and the band it falls into
    user_avg = db.scalar(
        select(student_scores.c.avg_score).where(
            student_scores.c.user_id == current_user.user_id
        )
    )
    your_band = (
        None
        if user_avg is None
        else BANDS[_band_index(user_avg) - 4][0]
    )

    return ScoreDistributionResponse(
        subject=subject_name,
        bands=bands,
        user_band=your_band,
        user_score=_round(user_avg),
    )