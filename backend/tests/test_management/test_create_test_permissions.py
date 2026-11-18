"""Authentication and role checks for POST /api/v1/test."""

from app.enums import UserRole

from .conftest import TESTS_URL


def test_create_test_requires_authentication(client, pool_subject, test_payload):
    response = client.post(TESTS_URL, json=test_payload(pool_subject.subject_id))
    assert response.status_code == 401


def test_create_test_as_student_returns_403(
    client, pool_subject, test_payload, auth_headers
):
    response = client.post(
        TESTS_URL,
        json=test_payload(pool_subject.subject_id),
        headers=auth_headers(UserRole.STUDENT),
    )
    assert response.status_code == 403
