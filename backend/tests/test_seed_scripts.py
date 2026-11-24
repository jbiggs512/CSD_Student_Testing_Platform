from datetime import datetime, timedelta, timezone
import re

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.security import hash_password, verify_password
from app.db.base import Base
import app.db.models  # noqa: F401
from app.db.models import (
    Course,
    Question,
    QuestionOption,
    Role,
    Subject,
    Test,
    TestAttempt,
    User,
    user_courses,
)
from app.db.scripts import seed_all as seed_all_module
from app.db.scripts.common import SeedCounts, calculate_attempt_score, verify_schema_ready
from app.db.scripts.seed_all import main, seed_all
from app.db.scripts.seed_roles import seed_roles
from app.db.scripts.seed_users import DEFAULT_PASSWORD
from app.enums import AccountStatus, SubjectStatus, UserRole


def _make_clean_sqlite_session() -> tuple[Session, object]:
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return factory(), engine


def test_calculate_attempt_score_and_seed_counts():
    assert calculate_attempt_score(4, 5) == 110
    assert calculate_attempt_score(10, 10) == 300
    assert calculate_attempt_score(3, 10) == 20
    assert calculate_attempt_score(0, 10) == 0

    counts = SeedCounts(created=2, skipped=1)
    counts += SeedCounts(created=3, skipped=4)
    assert counts == SeedCounts(created=5, skipped=5)


def test_verify_schema_ready_raises_when_tables_missing():
    engine = create_engine("sqlite:///:memory:")
    factory = sessionmaker(bind=engine)
    db = factory()
    try:
        try:
            verify_schema_ready(db)
            raise AssertionError("Expected RuntimeError when schema tables are missing.")
        except RuntimeError as exc:
            assert "missing tables" in str(exc)
            assert "alembic upgrade head" in str(exc)
    finally:
        db.close()
        engine.dispose()


def test_seed_all_fresh_database_realism_and_idempotency():
    db, engine = _make_clean_sqlite_session()
    try:
        report = seed_all(db)
        db.commit()

        assert report.roles.created == len(UserRole)
        assert report.courses.created >= 8
        assert report.subjects.created >= 24
        assert report.questions.created >= 260
        assert report.tests.created >= 30
        assert report.users.created >= 50
        assert report.user_courses.created >= 45
        assert report.test_attempts.created >= 80

        courses = db.scalars(select(Course)).all()
        assert len(courses) >= 8

        subjects = db.scalars(select(Subject)).all()
        disabled_subjects = [s for s in subjects if s.status == SubjectStatus.DISABLED]
        active_subjects = [s for s in subjects if s.status == SubjectStatus.ACTIVE]
        assert len(disabled_subjects) >= 2
        assert len(active_subjects) >= 22

        # Disabled subjects should remain without active tests.
        disabled_ids = {s.subject_id for s in disabled_subjects}
        tests = db.scalars(select(Test)).all()
        assert all(t.subject_id not in disabled_ids for t in tests)

        # Every active subject must meet minimum pool requirements and valid QPA.
        correct_positions: set[int] = set()
        for subject in active_subjects:
            pool = db.scalars(
                select(Question).where(Question.subject_id == subject.subject_id)
            ).all()
            assert len(pool) >= 10
            for question in pool:
                assert question.question_text.strip()
                assert not question.question_text.startswith("Sample Question")
                assert len(question.options) == 4
                correct_flags = [opt.is_correct for opt in question.options]
                assert sum(correct_flags) == 1
                correct_positions.add(correct_flags.index(True))
                assert len({opt.option_text for opt in question.options}) == 4

        assert correct_positions == {0, 1, 2, 3}

        for test in tests:
            pool_size = db.scalar(
                select(func.count(Question.question_id)).where(
                    Question.subject_id == test.subject_id
                )
            )
            assert test.description is not None
            assert test.description.strip()
            assert test.questions_per_attempt <= pool_size
            assert 100 % test.questions_per_attempt == 0

        # Users & role breakdown
        users = db.scalars(select(User)).all()
        admins = [u for u in users if u.role.role_name == UserRole.ADMIN.value]
        lecturers = [u for u in users if u.role.role_name == UserRole.LECTURER.value]
        students = [u for u in users if u.role.role_name == UserRole.STUDENT.value]
        assert len(admins) >= 3
        assert len(lecturers) >= 8
        assert len(students) >= 35
        assert {s.account_status for s in students} == {
            AccountStatus.ACTIVE,
            AccountStatus.PENDING,
            AccountStatus.DISABLED,
        }
        assert all(
            s.last_login is None
            for s in students
            if s.account_status == AccountStatus.PENDING
        )
        assert all(len(s.courses) >= 1 for s in students)

        # Attempts integrity & 7-day coverage
        attempts = db.scalars(select(TestAttempt)).all()
        assert len(attempts) >= 80
        recent_cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        recent_count = 0
        for attempt in attempts:
            assert attempt.completed_at is not None
            assert attempt.started_at < attempt.completed_at
            assert attempt.total_questions is not None
            assert attempt.total_questions > 0
            assert attempt.correct_questions is not None
            assert attempt.score == calculate_attempt_score(
                attempt.correct_questions, attempt.total_questions
            )
            completed_utc = (
                attempt.completed_at.replace(tzinfo=timezone.utc)
                if attempt.completed_at.tzinfo is None
                else attempt.completed_at
            )
            if completed_utc >= recent_cutoff:
                recent_count += 1
        assert recent_count >= 15

        snapshot_before = (
            db.scalar(select(func.count(Role.role_id))),
            db.scalar(select(func.count(Course.course_id))),
            db.scalar(select(func.count(Subject.subject_id))),
            db.scalar(select(func.count(Question.question_id))),
            db.scalar(select(func.count(QuestionOption.option_id))),
            db.scalar(select(func.count(Test.test_id))),
            db.scalar(select(func.count(User.user_id))),
            db.scalar(select(func.count()).select_from(user_courses)),
            db.scalar(select(func.count(TestAttempt.attempt_id))),
        )

        # Re-running must be strictly idempotent.
        second = seed_all(db)
        db.commit()

        for section in (
            second.roles,
            second.courses,
            second.subjects,
            second.questions,
            second.tests,
            second.users,
            second.user_courses,
            second.test_attempts,
        ):
            assert section.created == 0
            assert section.skipped > 0

        snapshot_after = (
            db.scalar(select(func.count(Role.role_id))),
            db.scalar(select(func.count(Course.course_id))),
            db.scalar(select(func.count(Subject.subject_id))),
            db.scalar(select(func.count(Question.question_id))),
            db.scalar(select(func.count(QuestionOption.option_id))),
            db.scalar(select(func.count(Test.test_id))),
            db.scalar(select(func.count(User.user_id))),
            db.scalar(select(func.count()).select_from(user_courses)),
            db.scalar(select(func.count(TestAttempt.attempt_id))),
        )
        assert snapshot_before == snapshot_after
    finally:
        db.close()
        engine.dispose()


def test_seed_all_upgrades_existing_legacy_baseline_database():
    db, engine = _make_clean_sqlite_session()
    try:
        seed_roles(db)
        roles_by_name = {r.role_name: r for r in db.scalars(select(Role)).all()}

        legacy_courses = [
            Course(course_title="BSc Software Engineering"),
            Course(course_title="BSc Computer Science"),
            Course(course_title="BSc Cyber Security"),
            Course(course_title="BSc Data Science"),
        ]
        db.add_all(legacy_courses)
        db.flush()

        oop_subject = Subject(
            subject_name="Object Oriented Programming",
            course_id=legacy_courses[0].course_id,
            status=SubjectStatus.ACTIVE,
        )
        db.add(oop_subject)
        db.flush()

        oop_test = Test(
            subject_id=oop_subject.subject_id,
            test_name="OOP Key Principles",
            description="This is a quick test on the key principles of OOP.",
            questions_per_attempt=5,
        )
        db.add(oop_test)
        db.flush()

        original_oop_texts = [
            "Which of the following best describes the principle of encapsulation in object-oriented programming?",
            "In the context of polymorphism, what enables dynamic method dispatch in languages like Java or C++?",
            "What is the primary architectural benefit of adhering to the Liskov Substitution Principle (LSP)?",
            "How does composition differ fundamentally from inheritance in object-oriented design?",
            "What is the main purpose of an abstract class in object-oriented programming?",
        ]
        for text_val in original_oop_texts:
            q = Question(
                subject_id=oop_subject.subject_id,
                test_id=oop_test.test_id,
                question_text=text_val,
                options=[
                    QuestionOption(option_text=f"Opt {i}", is_correct=(i == 0))
                    for i in range(4)
                ],
            )
            db.add(q)

        pw_hash = hash_password(DEFAULT_PASSWORD)
        legacy_student = User(
            username="student",
            first_name="Alex",
            last_name="Student",
            email="student@weston.ac.uk",
            password_hash=pw_hash,
            role_id=roles_by_name[UserRole.STUDENT.value].role_id,
            account_status=AccountStatus.ACTIVE,
        )
        legacy_student.courses.append(legacy_courses[0])
        db.add(legacy_student)
        db.commit()

        # Upgrading an already-seeded legacy database must add all remaining data
        # cleanly without skipping new OOP questions or failing on existing ones.
        upgrade_report = seed_all(db)
        db.commit()

        assert upgrade_report.courses.created == 4
        assert upgrade_report.courses.skipped == 4
        assert upgrade_report.questions.skipped == 5
        assert upgrade_report.questions.created >= 262
        assert upgrade_report.tests.skipped == 1
        assert upgrade_report.tests.created >= 33
        assert upgrade_report.users.skipped == 1
        assert upgrade_report.users.created >= 53
        assert upgrade_report.user_courses.skipped == 1
        assert upgrade_report.user_courses.created >= 48

        oop_count = db.scalar(
            select(func.count(Question.question_id)).where(
                Question.subject_id == oop_subject.subject_id
            )
        )
        assert oop_count == 15
    finally:
        db.close()
        engine.dispose()


def test_seed_all_baseline_only_and_password_env_overrides(monkeypatch):
    db, engine = _make_clean_sqlite_session()
    try:
        try:
            seed_all(db, baseline_only=True, require_custom_passwords=True)
            raise AssertionError("Expected ValueError when custom passwords are required.")
        except ValueError as exc:
            assert "SEED_DEFAULT_PASSWORD" in str(exc)
            db.rollback()

        monkeypatch.setenv("SEED_DEFAULT_PASSWORD", "SharedSeedPass99!")
        monkeypatch.setenv("SEED_ADMIN_PASSWORD", "AdminCustomPass99!")

        report = seed_all(
            db,
            baseline_only=True,
            require_custom_passwords=True,
        )
        db.commit()

        assert report.courses.created == 4
        assert report.subjects.created == 1
        assert report.questions.created == 5
        assert report.tests.created == 1
        assert report.users.created == 4
        assert report.user_courses.created == 3
        assert report.test_attempts.created == 1

        admin_user = db.scalar(select(User).where(User.username == "admin"))
        student_user = db.scalar(select(User).where(User.username == "student"))
        assert admin_user is not None
        assert student_user is not None
        assert verify_password("AdminCustomPass99!", admin_user.password_hash)
        assert verify_password("SharedSeedPass99!", student_user.password_hash)
    finally:
        db.close()
        engine.dispose()


def test_seed_all_cli_dry_run_migration_and_error_handling(monkeypatch, capsys):
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    monkeypatch.setattr(seed_all_module, "SessionLocal", factory)
    monkeypatch.setenv("SEED_ENV", "prod")

    try:
        exit_code = main(["--dry-run"])
        assert exit_code == 0

        captured = capsys.readouterr()
        assert "Warning: SEED_ENV=prod" in captured.err
        assert "[DRY RUN" in captured.out
        assert re.search(r"Users\s*:\s*54 created", captured.out)

        # Dry run must have rolled back every change.
        with factory() as verify_db:
            assert verify_db.scalar(select(func.count(User.user_id))) == 0

        # Passing --require-custom-passwords without env vars must return non-zero exit code.
        fail_code = main(["--require-custom-passwords"])
        assert fail_code == 1
        err_out = capsys.readouterr().err
        assert "Database seeding failed:" in err_out

        # Format check for non-dry-run report and --migrate flag delegation.
        migrated = {"called": False}
        monkeypatch.setattr(
            seed_all_module,
            "run_migrations",
            lambda: migrated.__setitem__("called", True),
        )
        ok_code = main(["--migrate", "--baseline-only"])
        assert ok_code == 0
        assert migrated["called"] is True
        assert "Seed Summary:" in capsys.readouterr().out
    finally:
        engine.dispose()


def test_seeded_accounts_power_student_lecturer_and_admin_endpoints(client, db_session):
    seed_all(db_session)
    db_session.commit()

    def _login(username: str) -> dict[str, str]:
        res = client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": DEFAULT_PASSWORD},
        )
        assert res.status_code == 200, res.text
        return {"Authorization": f"Bearer {res.json()['access_token']}"}

    student_headers = _login("student")
    lecturer_headers = _login("lecturer")
    admin_headers = _login("admin")

    # Student workflows
    outstanding = client.get("/api/v1/student/outstandingTests", headers=student_headers)
    assert outstanding.status_code == 200
    assert len(outstanding.json()) >= 2

    completed = client.get("/api/v1/student/completedTests", headers=student_headers)
    assert completed.status_code == 200
    assert len(completed.json()) == 3

    rank = client.get("/api/v1/student/cohortRank", headers=student_headers)
    assert rank.status_code == 200
    assert rank.json()["size"] >= 7

    subjects = client.get("/api/v1/student/subjects", headers=student_headers)
    assert subjects.status_code == 200
    oop_subject_id = next(
        s["value"] for s in subjects.json() if s["label"] == "Object Oriented Programming"
    )

    leaderboard = client.get(
        f"/api/v1/student/leaderboard/{oop_subject_id}", headers=student_headers
    )
    assert leaderboard.status_code == 200
    assert len(leaderboard.json()["top_students"]) == 5

    stats = client.get("/api/v1/student/statistics", headers=student_headers)
    assert stats.status_code == 200
    assert stats.json()["best_score"]["score"] == 90
    assert stats.json()["worst_score"]["score"] == 70
    assert stats.json()["average_score"] == 80

    grades = client.get("/api/v1/student/gradesOverTime", headers=student_headers)
    assert grades.status_code == 200
    assert len(grades.json()["points"]) == 3

    first_outstanding_id = outstanding.json()[0]["id"]
    fetched_test = client.get(f"/api/v1/test/{first_outstanding_id}", headers=student_headers)
    assert fetched_test.status_code == 200
    assert len(fetched_test.json()["questions"]) >= 5

    # Lecturer workflows
    tests_res = client.get("/api/v1/test", headers=lecturer_headers)
    assert tests_res.status_code == 200
    assert len(tests_res.json()) >= 34

    mgmt_stats = client.get("/api/v1/test/stats", headers=lecturer_headers)
    assert mgmt_stats.status_code == 200
    mgmt_payload = mgmt_stats.json()
    assert mgmt_payload["student_total"] >= 30
    assert mgmt_payload["student_average_last_7_days"] is not None
    assert mgmt_payload["weakest_test_last_7_days"] is not None

    test_with_attempts = next(t for t in tests_res.json() if t["attempt_count"] > 0)
    results = client.get(
        f"/api/v1/test/{test_with_attempts['test_id']}/results",
        headers=lecturer_headers,
    )
    assert results.status_code == 200
    assert len(results.json()["attempts"]) == test_with_attempts["attempt_count"]

    students_res = client.get("/api/v1/user/student", headers=lecturer_headers)
    assert students_res.status_code == 200
    assert len(students_res.json()) >= 40

    # Admin workflows
    lecturers_res = client.get("/api/v1/user/lecturer", headers=admin_headers)
    assert lecturers_res.status_code == 200
    assert len(lecturers_res.json()) >= 10

    all_subjects = client.get("/api/v1/subject", headers=admin_headers)
    assert all_subjects.status_code == 200
    assert len(all_subjects.json()) >= 24

    all_courses = client.get("/api/v1/course", headers=admin_headers)
    assert all_courses.status_code == 200
    assert len(all_courses.json()) >= 8
