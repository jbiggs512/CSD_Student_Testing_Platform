"""Validation and business-rule tests for POST /api/v1/test."""

import pytest

from app.enums import SubjectStatus, UserRole

from .conftest import TESTS_URL


def test_create_test_unknown_subject_returns_404(client, test_payload, auth_headers):
    response = client.post(
        TESTS_URL, json=test_payload(999999), headers=auth_headers(UserRole.LECTURER)
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Subject not found."


def test_create_test_disabled_subject_returns_400(
    client, make_subject, add_pool_questions, test_payload, auth_headers
):
    subject = make_subject(status=SubjectStatus.DISABLED)
    add_pool_questions(subject, 5)

    response = client.post(
        TESTS_URL,
        json=test_payload(subject.subject_id),
        headers=auth_headers(UserRole.LECTURER),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Tests cannot be created for a disabled subject."


def test_create_test_rejects_duplicate_name_case_insensitive(
    client, pool_subject, test_payload, auth_headers
):
    headers = auth_headers(UserRole.LECTURER)

    first = client.post(
        TESTS_URL, json=test_payload(pool_subject.subject_id), headers=headers
    )
    assert first.status_code == 201

    duplicate = client.post(
        TESTS_URL,
        json=test_payload(pool_subject.subject_id, test_name="WEEK 1 quiz"),
        headers=headers,
    )
    assert duplicate.status_code == 400
    assert (
        duplicate.json()["detail"]
        == "A test with this name already exists for this subject."
    )


def test_create_test_empty_pool_returns_400(
    client, make_subject, test_payload, auth_headers
):
    subject = make_subject()

    response = client.post(
        TESTS_URL,
        json=test_payload(subject.subject_id),
        headers=auth_headers(UserRole.LECTURER),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "This subject has no questions in its question pool."


def test_create_test_questions_per_attempt_exceeds_pool_returns_400(
    client, make_subject, add_pool_questions, test_payload, auth_headers
):
    subject = make_subject()
    add_pool_questions(subject, 2)

    response = client.post(
        TESTS_URL,
        json=test_payload(subject.subject_id, questions_per_attempt=3),
        headers=auth_headers(UserRole.LECTURER),
    )
    assert response.status_code == 400
    assert "cannot exceed" in response.json()["detail"]


def test_create_test_whitespace_name_returns_400(
    client, pool_subject, test_payload, auth_headers
):
    response = client.post(
        TESTS_URL,
        json=test_payload(pool_subject.subject_id, test_name="   "),
        headers=auth_headers(UserRole.LECTURER),
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Test name is required."


@pytest.mark.parametrize(
    "overrides",
    [
        {"test_name": ""},
        {"test_name": "x" * 161},
        {"time_limit_minutes": 0},
        {"time_limit_minutes": -5},
        {"questions_per_attempt": 0},
    ],
)
def test_create_test_invalid_fields_return_422(
    client, pool_subject, test_payload, auth_headers, overrides
):
    response = client.post(
        TESTS_URL,
        json=test_payload(pool_subject.subject_id, **overrides),
        headers=auth_headers(UserRole.LECTURER),
    )
    assert response.status_code == 422
