from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.models import Subject, Test, TestAttempt, User
from app.db.scripts.common import SeedCounts, calculate_attempt_score
from app.db.scripts.seed_users import DEFAULT_USERS
from app.db.session import SessionLocal
from app.enums import AccountStatus, UserRole


@dataclass(frozen=True)
class PlannedAttempt:
    """Deterministic blueprint for one completed seeded student test attempt."""

    test_id: int
    total_questions: int
    correct_questions: int
    days_ago: int
    hour_offset: int
    duration_minutes: int
    time_limit_minutes: int | None


# Curated history for the primary demo account (`student`), leaving at least
# two Software Engineering tests outstanding while giving clear statistics points.
_PRIMARY_STUDENT_PLAN: tuple[tuple[str, int, int, int], ...] = (
    ("OOP Key Principles", 4, 21, 7),
    ("SOLID Principles & Design Patterns", 7, 11, 14),
    ("HTTP, REST & API Design", 9, 3, 11),
)

# Challenging assessments intentionally tuned slightly lower in the last 7 days
# so lecturer "Weakest Test (Last 7 Days)" and score spreads stay realistic.
_TEST_DIFFICULTY_OFFSETS: dict[str, int] = {
    "Symmetric & Asymmetric Cryptography": -2,
    "Memory Management & Deadlocks": -2,
    "Backpropagation & CNN Architectures": -1,
    "Reconnaissance & Exploitation Lifecycle": -1,
}


def _bounded_correct_count(
    raw_correct: int,
    total_questions: int,
) -> int:
    floor_correct = 2 if total_questions >= 5 else 1
    return max(floor_correct, min(total_questions, raw_correct))


def _build_attempt_row(
    user_id: int,
    plan: PlannedAttempt,
    now_utc: datetime,
) -> TestAttempt:
    completed_at = now_utc - timedelta(
        days=plan.days_ago,
        hours=plan.hour_offset,
    )
    duration = plan.duration_minutes
    if plan.time_limit_minutes is not None and plan.time_limit_minutes > 1:
        duration = min(duration, plan.time_limit_minutes - 1)
    started_at = completed_at - timedelta(minutes=duration)

    return TestAttempt(
        user_id=user_id,
        test_id=plan.test_id,
        started_at=started_at,
        completed_at=completed_at,
        score=calculate_attempt_score(plan.correct_questions, plan.total_questions),
        total_questions=plan.total_questions,
        correct_questions=plan.correct_questions,
    )


def _plan_primary_student_attempts(
    course_tests: list[Test],
) -> list[PlannedAttempt]:
    tests_by_name = {test.test_name: test for test in course_tests}
    plans: list[PlannedAttempt] = []
    for index, (test_name, correct, days_ago, duration) in enumerate(_PRIMARY_STUDENT_PLAN):
        test = tests_by_name.get(test_name)
        if test is None:
            continue
        plans.append(
            PlannedAttempt(
                test_id=test.test_id,
                total_questions=test.questions_per_attempt,
                correct_questions=_bounded_correct_count(
                    correct, test.questions_per_attempt
                ),
                days_ago=days_ago,
                hour_offset=index + 1,
                duration_minutes=duration,
                time_limit_minutes=test.time_limit_minutes,
            )
        )
    return plans


def _plan_cohort_student_attempts(
    student_index: int,
    course_tests: list[Test],
) -> list[PlannedAttempt]:
    if not course_tests:
        return []

    total_course_tests = len(course_tests)
    if total_course_tests >= 3:
        tests_to_take = min(total_course_tests - 1, 2 + (student_index % 3))
    else:
        tests_to_take = total_course_tests

    # Deterministic spread covering ~45% to 95% ability across peers so
    # leaderboards differentiate cleanly instead of tying at identical totals.
    base_ratio = 0.55 + ((student_index * 7) % 9) * 0.045
    plans: list[PlannedAttempt] = []

    for slot in range(tests_to_take):
        test = course_tests[(student_index + slot) % total_course_tests]
        difficulty_offset = _TEST_DIFFICULTY_OFFSETS.get(test.test_name, 0)
        slot_variation = ((student_index + slot) % 3) - 1
        target_correct = round(base_ratio * test.questions_per_attempt) + difficulty_offset + slot_variation
        correct = _bounded_correct_count(target_correct, test.questions_per_attempt)

        # Ensure ~40% of cohort attempts land cleanly inside the last 7 days.
        is_recent = (student_index + slot) % 5 < 2
        days_ago = (1 + ((student_index + slot * 2) % 5)) if is_recent else (8 + ((student_index * 3 + slot * 5) % 20))
        duration = 5 + ((student_index + slot * 3) % 10)

        plans.append(
            PlannedAttempt(
                test_id=test.test_id,
                total_questions=test.questions_per_attempt,
                correct_questions=correct,
                days_ago=days_ago,
                hour_offset=(student_index + slot) % 6,
                duration_minutes=duration,
                time_limit_minutes=test.time_limit_minutes,
            )
        )

    # Give ~1 in 4 students a realistic improved retake on their first test.
    if student_index % 4 == 0 and plans:
        first = plans[0]
        improved_correct = _bounded_correct_count(
            first.correct_questions + 1, first.total_questions
        )
        plans.append(
            PlannedAttempt(
                test_id=first.test_id,
                total_questions=first.total_questions,
                correct_questions=improved_correct,
                days_ago=max(1, first.days_ago - 4),
                hour_offset=2,
                duration_minutes=max(4, first.duration_minutes - 1),
                time_limit_minutes=first.time_limit_minutes,
            )
        )

    return plans


def _seed_baseline_attempt(
    db: Session,
    student: User | None,
    tests_by_course: dict[int, list[Test]],
    existing_counts: dict[tuple[int, int], int],
    now_utc: datetime,
) -> SeedCounts:
    if student is None or not student.courses:
        return SeedCounts()

    oop_test = next(
        (
            test
            for test in tests_by_course.get(student.courses[0].course_id, [])
            if test.test_name == "OOP Key Principles"
        ),
        None,
    )
    if oop_test is None:
        return SeedCounts()

    if existing_counts.get((student.user_id, oop_test.test_id), 0) > 0:
        return SeedCounts(created=0, skipped=1)

    plan = PlannedAttempt(
        test_id=oop_test.test_id,
        total_questions=oop_test.questions_per_attempt,
        correct_questions=_bounded_correct_count(4, oop_test.questions_per_attempt),
        days_ago=2,
        hour_offset=3,
        duration_minutes=6,
        time_limit_minutes=oop_test.time_limit_minutes,
    )
    db.add(_build_attempt_row(student.user_id, plan, now_utc))
    db.flush()
    return SeedCounts(created=1, skipped=0)


def _load_tests_by_course(db: Session) -> dict[int, list[Test]]:
    tests = db.scalars(
        select(Test)
        .options(selectinload(Test.subject).selectinload(Subject.course))
        .order_by(Test.test_id.asc())
    ).all()

    tests_by_course: dict[int, list[Test]] = {}
    for test in tests:
        tests_by_course.setdefault(test.subject.course_id, []).append(test)
    for course_tests in tests_by_course.values():
        course_tests.sort(key=lambda item: (item.subject.subject_name, item.test_id))
    return tests_by_course


def _load_existing_attempt_counts(db: Session) -> dict[tuple[int, int], int]:
    existing_rows = db.execute(
        select(
            TestAttempt.user_id,
            TestAttempt.test_id,
            func.count(TestAttempt.attempt_id),
        ).group_by(TestAttempt.user_id, TestAttempt.test_id)
    ).all()
    return {(row[0], row[1]): int(row[2]) for row in existing_rows}


def _collect_missing_attempts_for_student(
    student: User,
    plans: list[PlannedAttempt],
    existing_counts: dict[tuple[int, int], int],
    now_utc: datetime,
) -> tuple[list[TestAttempt], SeedCounts]:
    planned_by_test: dict[int, list[PlannedAttempt]] = {}
    for plan in plans:
        planned_by_test.setdefault(plan.test_id, []).append(plan)

    missing_rows: list[TestAttempt] = []
    counts = SeedCounts()

    for test_id, pair_plans in planned_by_test.items():
        already_present = existing_counts.get((student.user_id, test_id), 0)
        to_skip = min(already_present, len(pair_plans))
        counts.skipped += to_skip
        for missing_plan in pair_plans[to_skip:]:
            missing_rows.append(
                _build_attempt_row(student.user_id, missing_plan, now_utc)
            )
            counts.created += 1

    return missing_rows, counts


def seed_test_attempt_data(
    db: Session,
    *,
    baseline_only: bool = False,
) -> SeedCounts:
    """Seed realistic historical test attempts for enrolled active students idempotently."""
    active_student_usernames = [
        spec.username
        for spec in DEFAULT_USERS
        if spec.role == UserRole.STUDENT and spec.account_status == AccountStatus.ACTIVE
    ]
    if not active_student_usernames:
        return SeedCounts()

    students_by_username = {
        user.username: user
        for user in db.scalars(
            select(User)
            .options(selectinload(User.courses))
            .where(User.username.in_(active_student_usernames))
        ).all()
    }
    tests_by_course = _load_tests_by_course(db)
    existing_counts = _load_existing_attempt_counts(db)

    now_utc = datetime.now(timezone.utc)
    if baseline_only:
        return _seed_baseline_attempt(
            db,
            students_by_username.get("student"),
            tests_by_course,
            existing_counts,
            now_utc,
        )

    counts = SeedCounts()
    new_attempts: list[TestAttempt] = []
    cohort_index = 0

    for username in active_student_usernames:
        student = students_by_username.get(username)
        if student is None or not student.courses:
            continue

        course_tests = tests_by_course.get(student.courses[0].course_id, [])
        if username == "student":
            plans = _plan_primary_student_attempts(course_tests)
        else:
            plans = _plan_cohort_student_attempts(cohort_index, course_tests)
            cohort_index += 1

        student_attempts, student_counts = _collect_missing_attempts_for_student(
            student, plans, existing_counts, now_utc
        )
        new_attempts.extend(student_attempts)
        counts += student_counts

    if new_attempts:
        db.add_all(new_attempts)
        db.flush()

    return counts


if __name__ == "__main__":
    with SessionLocal.begin() as db:
        result = seed_test_attempt_data(db)
        print(
            f"Test attempts seeded: {result.created} created, {result.skipped} skipped."
        )
