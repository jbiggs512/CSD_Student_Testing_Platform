"""Happy-path tests for POST /api/v1/test."""

from app.api.v1.test.schemas import MIN_QUESTIONS_PER_ATTEMPT
from app.db.models import Test
from app.enums import UserRole

from .conftest import TESTS_URL


def test_create_test_as_lecturer(
    client, db_session, pool_subject, test_payload, auth_headers
):
    headers = auth_headers(UserRole.LECTURER)

    response = client.post(
        TESTS_URL, json=test_payload(pool_subject.subject_id), headers=headers
    )
    assert response.status_code == 201, response.text

    data = response.json()
    assert data["test_name"] == "Week 1 Quiz"
    assert data["description"] == "Covers the basics."
    assert data["subject_id"] == pool_subject.subject_id
    assert data["subject_name"] == pool_subject.subject_name
    assert data["course_title"] == "BSc Software Engineering"
    assert data["time_limit_minutes"] == 20
    assert data["questions_per_attempt"] == MIN_QUESTIONS_PER_ATTEMPT
    assert data["pool_size"] == MIN_QUESTIONS_PER_ATTEMPT

    stored = db_session.get(Test, data["test_id"])
    assert stored is not None
    assert stored.subject_id == pool_subject.subject_id
    # Pool questions are not re-linked to the new test.
    assert stored.questions == []


def test_create_test_as_admin_with_defaults(
    client, make_subject, add_pool_questions, auth_headers
):
    subject = make_subject()
    add_pool_questions(subject, MIN_QUESTIONS_PER_ATTEMPT)
    headers = auth_headers(UserRole.ADMIN)

    response = client.post(
        TESTS_URL,
        json={"subject_id": subject.subject_id, "test_name": "  Untimed   test  "},
        headers=headers,
    )
    assert response.status_code == 201, response.text

    data = response.json()
    assert data["test_name"] == "Untimed test"
    assert data["description"] is None
    assert data["time_limit_minutes"] is None
    assert data["questions_per_attempt"] == MIN_QUESTIONS_PER_ATTEMPT
