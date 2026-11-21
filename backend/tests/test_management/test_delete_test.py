"""Tests for DELETE /api/v1/test/{test_id}."""

import uuid

from sqlalchemy import select

from app.api.v1.test.schemas import MIN_QUESTIONS_PER_ATTEMPT
from app.core.security import hash_password
from app.db.models import Question, QuestionOption, Role, Test, TestAttempt, User
from app.enums import AccountStatus, UserRole

from .conftest import TESTS_URL


def _make_student(db_session) -> User:
    role = db_session.scalar(
        select(Role).where(Role.role_name == UserRole.STUDENT.value)
    )
    assert role is not None
    unique = uuid.uuid4().hex[:8]
    user = User(
        username=f"WS_{unique}",
        first_name="Delete",
        last_name="Tester",
        email=f"delete_{unique}@weston.ac.uk",
        password_hash=hash_password("StudentPass123!"),
        role_id=role.role_id,
        account_status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_delete_test_as_lecturer(
    client, db_session, pool_subject, test_payload, auth_headers
):
    headers = auth_headers(UserRole.LECTURER)
    create_res = client.post(
        TESTS_URL,
        json=test_payload(pool_subject.subject_id, test_name="Quiz To Delete"),
        headers=headers,
    )
    assert create_res.status_code == 201
    test_id = create_res.json()["test_id"]

    delete_res = client.delete(f"{TESTS_URL}/{test_id}", headers=headers)
    assert delete_res.status_code == 204

    assert db_session.get(Test, test_id) is None

    list_res = client.get(TESTS_URL, headers=headers)
    assert list_res.status_code == 200
    assert all(item["test_id"] != test_id for item in list_res.json())


def test_delete_test_removes_attempts_and_detaches_questions(
    client, db_session, pool_subject, test_payload, auth_headers
):
    headers = auth_headers(UserRole.ADMIN)
    create_res = client.post(
        TESTS_URL,
        json=test_payload(pool_subject.subject_id, test_name="Attempted Exam"),
        headers=headers,
    )
    assert create_res.status_code == 201
    test_id = create_res.json()["test_id"]

    student_one = _make_student(db_session)
    student_two = _make_student(db_session)
    db_session.add_all(
        [
            TestAttempt(
                test_id=test_id,
                user_id=student_one.user_id,
                score=60,
                correct_questions=2,
                total_questions=MIN_QUESTIONS_PER_ATTEMPT,
            ),
            TestAttempt(
                test_id=test_id,
                user_id=student_one.user_id,
                score=90,
                correct_questions=3,
                total_questions=MIN_QUESTIONS_PER_ATTEMPT,
            ),
            TestAttempt(
                test_id=test_id,
                user_id=student_two.user_id,
                score=30,
                correct_questions=1,
                total_questions=MIN_QUESTIONS_PER_ATTEMPT,
            ),
        ]
    )

    linked_question = Question(
        subject_id=None,
        test_id=test_id,
        question_text="Question originally attached to test only",
    )
    db_session.add(linked_question)
    db_session.flush()
    for opt_idx in range(4):
        db_session.add(
            QuestionOption(
                question_id=linked_question.question_id,
                option_text=f"Choice {opt_idx + 1}",
                is_correct=opt_idx == 0,
            )
        )
    db_session.commit()
    linked_question_id = linked_question.question_id

    list_res = client.get(TESTS_URL, headers=headers)
    assert list_res.status_code == 200
    listed = next(item for item in list_res.json() if item["test_id"] == test_id)
    assert listed["attempted_student_count"] == 2

    delete_res = client.delete(f"{TESTS_URL}/{test_id}", headers=headers)
    assert delete_res.status_code == 204

    assert db_session.get(Test, test_id) is None
    remaining_attempts = db_session.scalars(
        select(TestAttempt).where(TestAttempt.test_id == test_id)
    ).all()
    assert remaining_attempts == []

    preserved_question = db_session.get(Question, linked_question_id)
    assert preserved_question is not None
    assert preserved_question.test_id is None
    assert preserved_question.subject_id == pool_subject.subject_id


def test_delete_test_not_found_and_permissions(
    client, pool_subject, test_payload, auth_headers
):
    lecturer_headers = auth_headers(UserRole.LECTURER)
    student_headers = auth_headers(UserRole.STUDENT)

    missing_res = client.delete(f"{TESTS_URL}/999999", headers=lecturer_headers)
    assert missing_res.status_code == 404
    assert missing_res.json()["detail"] == "Test not found."

    create_res = client.post(
        TESTS_URL,
        json=test_payload(pool_subject.subject_id, test_name="Protected Test"),
        headers=lecturer_headers,
    )
    assert create_res.status_code == 201
    test_id = create_res.json()["test_id"]

    assert client.delete(f"{TESTS_URL}/{test_id}").status_code == 401
    assert (
        client.delete(f"{TESTS_URL}/{test_id}", headers=student_headers).status_code
        == 403
    )
