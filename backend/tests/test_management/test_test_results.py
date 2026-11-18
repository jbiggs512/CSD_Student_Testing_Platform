"""Tests for lecturer test listing, summary stats, and per-test results."""

from datetime import datetime, timedelta, timezone
import uuid

from sqlalchemy import select

from app.core.security import hash_password
from app.api.v1.test.schemas import MIN_QUESTIONS_PER_ATTEMPT
from app.db.models import Role, Test, TestAttempt, User
from app.enums import AccountStatus, UserRole

from .conftest import TESTS_URL


def _create_student(
    db_session,
    *,
    first_name: str,
    last_name: str,
    account_status: AccountStatus = AccountStatus.ACTIVE,
) -> User:
    student_role = db_session.scalar(
        select(Role).where(Role.role_name == UserRole.STUDENT.value)
    )
    assert student_role is not None
    unique = uuid.uuid4().hex[:8]
    user = User(
        username=f"WS_{unique}",
        first_name=first_name,
        last_name=last_name,
        email=f"ws_{unique}@weston.ac.uk",
        password_hash=hash_password("StudentPass123!"),
        role_id=student_role.role_id,
        account_status=account_status,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _create_test_via_api(
    client,
    headers: dict[str, str],
    test_payload,
    subject_id: int,
    test_name: str,
) -> dict:
    res = client.post(
        TESTS_URL,
        json=test_payload(subject_id, test_name=test_name),
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_list_tests_includes_pool_and_attempt_summaries(
    client, db_session, pool_subject, test_payload, auth_headers
):
    headers = auth_headers(UserRole.LECTURER)
    created = _create_test_via_api(
        client, headers, test_payload, pool_subject.subject_id, "Algorithms Quiz"
    )
    student = _create_student(db_session, first_name="Alex", last_name="River")

    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            TestAttempt(
                test_id=created["test_id"],
                user_id=student.user_id,
                started_at=now - timedelta(minutes=15),
                completed_at=now - timedelta(minutes=10),
                score=80,
                correct_questions=8,
                total_questions=10,
            ),
            TestAttempt(
                test_id=created["test_id"],
                user_id=student.user_id,
                started_at=now - timedelta(minutes=5),
                completed_at=now,
                score=60,
                correct_questions=6,
                total_questions=10,
            ),
        ]
    )
    db_session.commit()

    response = client.get(TESTS_URL, headers=headers)
    assert response.status_code == 200
    items = response.json()
    matched = next(
        (item for item in items if item["test_id"] == created["test_id"]),
        None,
    )
    assert matched is not None
    assert matched["test_name"] == "Algorithms Quiz"
    assert matched["pool_size"] == MIN_QUESTIONS_PER_ATTEMPT
    assert matched["attempt_count"] == 2
    assert matched["average_percentage"] == 70.0


def test_get_test_management_stats_and_permissions(
    client, db_session, pool_subject, test_payload, auth_headers
):
    lecturer_headers = auth_headers(UserRole.LECTURER)
    student_headers = auth_headers(UserRole.STUDENT)

    assert client.get(TESTS_URL).status_code == 401
    assert client.get(TESTS_URL, headers=student_headers).status_code == 403
    assert client.get(f"{TESTS_URL}/stats", headers=student_headers).status_code == 403
    assert (
        client.get(f"{TESTS_URL}/1/results", headers=student_headers).status_code
        == 403
    )

    strong_test = _create_test_via_api(
        client,
        lecturer_headers,
        test_payload,
        pool_subject.subject_id,
        "Strong Assessment",
    )
    weak_test = _create_test_via_api(
        client,
        lecturer_headers,
        test_payload,
        pool_subject.subject_id,
        "Weak Assessment",
    )

    active_student = _create_student(db_session, first_name="Sam", last_name="Lee")
    _create_student(
        db_session,
        first_name="Pending",
        last_name="User",
        account_status=AccountStatus.PENDING,
    )

    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            TestAttempt(
                test_id=strong_test["test_id"],
                user_id=active_student.user_id,
                started_at=now - timedelta(hours=2),
                completed_at=now - timedelta(hours=1),
                score=270,
                correct_questions=9,
                total_questions=10,
            ),
            TestAttempt(
                test_id=weak_test["test_id"],
                user_id=active_student.user_id,
                started_at=now - timedelta(hours=3),
                completed_at=now - timedelta(hours=2),
                score=30,
                correct_questions=3,
                total_questions=10,
            ),
            # Older than 7 days: should be excluded from 7-day metrics
            TestAttempt(
                test_id=strong_test["test_id"],
                user_id=active_student.user_id,
                started_at=now - timedelta(days=10),
                completed_at=now - timedelta(days=10),
                score=0,
                correct_questions=1,
                total_questions=10,
            ),
        ]
    )
    db_session.commit()

    stats_res = client.get(f"{TESTS_URL}/stats", headers=lecturer_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["student_total"] >= 2
    assert stats["student_average_last_7_days"] == 60.0
    assert stats["weakest_test_last_7_days"] == "Weak Assessment"


def test_get_test_results_empty_populated_and_404(
    client, db_session, pool_subject, test_payload, auth_headers
):
    headers = auth_headers(UserRole.ADMIN)

    missing = client.get(f"{TESTS_URL}/999999/results", headers=headers)
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Test not found."

    created = _create_test_via_api(
        client, headers, test_payload, pool_subject.subject_id, "Security Midterm"
    )
    empty_res = client.get(
        f"{TESTS_URL}/{created['test_id']}/results", headers=headers
    )
    assert empty_res.status_code == 200
    empty_data = empty_res.json()
    assert empty_data["attempt_count"] == 0
    assert empty_data["average_percentage"] is None
    assert empty_data["highest_score"] is None
    assert empty_data["lowest_score"] is None
    assert empty_data["attempts"] == []

    alice = _create_student(db_session, first_name="Alice", last_name="Ng")
    bob = _create_student(db_session, first_name="Bob", last_name="Patel")

    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            TestAttempt(
                test_id=created["test_id"],
                user_id=alice.user_id,
                started_at=now - timedelta(minutes=20),
                completed_at=now - timedelta(minutes=10),
                score=220,
                correct_questions=8,
                total_questions=10,
            ),
            TestAttempt(
                test_id=created["test_id"],
                user_id=bob.user_id,
                started_at=now - timedelta(minutes=10),
                completed_at=now,
                score=100,
                correct_questions=4,
                total_questions=10,
            ),
        ]
    )
    db_session.commit()

    results_res = client.get(
        f"{TESTS_URL}/{created['test_id']}/results", headers=headers
    )
    assert results_res.status_code == 200
    data = results_res.json()
    assert data["test_name"] == "Security Midterm"
    assert data["attempt_count"] == 2
    assert data["average_percentage"] == 60.0
    assert data["highest_score"] == 220
    assert data["lowest_score"] == 100
    assert [item["student_name"] for item in data["attempts"]] == [
        "Bob Patel",
        "Alice Ng",
    ]
    assert data["attempts"][0]["percentage"] == 40.0
    assert data["attempts"][1]["percentage"] == 80.0
