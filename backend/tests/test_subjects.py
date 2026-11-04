
import uuid

import pytest

from sqlalchemy import select

from app.db.models import Course, Subject
from app.enums import SubjectStatus, UserRole


SUBJECTS_URL = "/api/v1/subject"


@pytest.fixture
def test_course(db_session):
    """
    Return the default Software Engineering course.

    Create it if it does not already exist.
    """

    course = db_session.scalar(
        select(Course).where(
            Course.course_title == "BSc Software Engineering"
        )
    )

    if course is None:
        course = Course(
            course_title="BSc Software Engineering"
        )

        db_session.add(course)
        db_session.commit()
        db_session.refresh(course)

    return course


def create_test_subject(db_session, test_course, subject_name=None):
    """
    Create a subject directly in the test database.

    Used to provide existing subjects for update, retrieval
    and deletion tests.
    """

    if subject_name is None:
        subject_name = f"Test Subject {uuid.uuid4().hex[:8]}"

    subject = Subject(
        subject_name=subject_name,
        course_id=test_course.course_id,
        status=SubjectStatus.ACTIVE,
    )

    db_session.add(subject)
    db_session.commit()
    db_session.refresh(subject)

    return subject


# -------------------------------------------------------------------------
# CREATE SUBJECT
# -------------------------------------------------------------------------


def test_create_subject_as_admin(
    client, db_session, test_course, auth_headers
):
    """
    An admin should be able to create a subject.
    """

    headers = auth_headers(UserRole.ADMIN)

    subject_data = {
        "subject_name": "Software Testing",
        "course_id": test_course.course_id,
    }

    response = client.post(
        SUBJECTS_URL,
        json=subject_data,
        headers=headers,
    )

    assert response.status_code == 201

    data = response.json()

    assert data["subject_name"] == subject_data["subject_name"]
    assert data["course_id"] == test_course.course_id
    assert data["course_title"] == test_course.course_title
    assert data["status"] == SubjectStatus.ACTIVE.value

    # Verify the subject was persisted in the database.
    stored_subject = db_session.scalar(
        select(Subject).where(
            Subject.subject_id == data["subject_id"]
        )
    )

    assert stored_subject is not None
    assert stored_subject.subject_name == subject_data["subject_name"]


def test_create_duplicate_subject_returns_400(
    client, test_course, auth_headers
):
    """
    Creating the same subject for the same course twice
    should return 400.
    """

    headers = auth_headers(UserRole.ADMIN)

    subject_data = {
        "subject_name": "Duplicate Subject",
        "course_id": test_course.course_id,
    }

    first_response = client.post(
        SUBJECTS_URL,
        json=subject_data,
        headers=headers,
    )

    assert first_response.status_code == 201

    second_response = client.post(
        SUBJECTS_URL,
        json=subject_data,
        headers=headers,
    )

    assert second_response.status_code == 400
    assert second_response.json()["detail"] == (
        "Subject already exists for this course."
    )


def test_create_subject_as_student_returns_403(
    client, test_course, auth_headers
):
    """
    A student should not be able to create a subject.
    """

    headers = auth_headers(UserRole.STUDENT)

    subject_data = {
        "subject_name": "Student Created Subject",
        "course_id": test_course.course_id,
    }

    response = client.post(
        SUBJECTS_URL,
        json=subject_data,
        headers=headers,
    )

    assert response.status_code == 403


def test_create_subject_as_lecturer_returns_403(
    client, test_course, auth_headers
):
    """
    A lecturer should not be able to create a subject.
    """

    headers = auth_headers(UserRole.LECTURER)

    subject_data = {
        "subject_name": "Lecturer Created Subject",
        "course_id": test_course.course_id,
    }

    response = client.post(
        SUBJECTS_URL,
        json=subject_data,
        headers=headers,
    )

    assert response.status_code == 403


# -------------------------------------------------------------------------
# UPDATE SUBJECT
# -------------------------------------------------------------------------


def test_update_subject_as_admin(
    client, db_session, test_course, auth_headers
):
    """
    An admin should be able to update an existing subject.
    """

    headers = auth_headers(UserRole.ADMIN)

    subject = create_test_subject(
        db_session,
        test_course,
        "Original Subject",
    )

    update_data = {
        "subject_name": "Updated Subject",
        "course_id": test_course.course_id,
    }

    response = client.patch(
        f"{SUBJECTS_URL}/{subject.subject_id}",
        json=update_data,
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["subject_id"] == subject.subject_id
    assert data["subject_name"] == "Updated Subject"
    assert data["course_id"] == test_course.course_id
    assert data["course_title"] == test_course.course_title

    # Verify the database was updated.
    db_session.refresh(subject)

    assert subject.subject_name == "Updated Subject"


def test_admin_can_disable_and_reenable_subject(
    client, db_session, test_course, auth_headers
):
    headers = auth_headers(UserRole.ADMIN)
    subject = create_test_subject(db_session, test_course)

    disable_response = client.patch(
        f"{SUBJECTS_URL}/{subject.subject_id}",
        json={"status": SubjectStatus.DISABLED.value},
        headers=headers,
    )

    assert disable_response.status_code == 200
    assert disable_response.json()["status"] == SubjectStatus.DISABLED.value

    enable_response = client.patch(
        f"{SUBJECTS_URL}/{subject.subject_id}",
        json={"status": SubjectStatus.ACTIVE.value},
        headers=headers,
    )

    assert enable_response.status_code == 200
    assert enable_response.json()["status"] == SubjectStatus.ACTIVE.value


def test_update_missing_subject_returns_404(
    client, auth_headers
):
    """
    Updating a subject which does not exist should return 404.
    """

    headers = auth_headers(UserRole.ADMIN)

    update_data = {
        "subject_name": "Updated Subject",
        "course_id": 1,
    }

    response = client.patch(
        f"{SUBJECTS_URL}/999999",
        json=update_data,
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Subject not found."


def test_update_subject_as_student_returns_403(
    client, db_session, test_course, auth_headers
):
    """
    A student should not be able to update a subject.
    """

    headers = auth_headers(UserRole.STUDENT)

    subject = create_test_subject(db_session, test_course)

    update_data = {
        "subject_name": "Updated Subject",
        "course_id": test_course.course_id,
    }

    response = client.patch(
        f"{SUBJECTS_URL}/{subject.subject_id}",
        json=update_data,
        headers=headers,
    )

    assert response.status_code == 403


def test_update_subject_as_lecturer_returns_403(
    client, test_course, auth_headers
):
    """
    A lecturer should not be able to update a subject.
    """

    headers = auth_headers(UserRole.LECTURER)

    subject_data = {
        "subject_name": "Updated Subject",
        "course_id": test_course.course_id,
    }

    response = client.patch(
        f"{SUBJECTS_URL}/999999",
        json=subject_data,
        headers=headers,
    )

    assert response.status_code == 403


# -------------------------------------------------------------------------
# GET SINGLE SUBJECT
# -------------------------------------------------------------------------


def test_get_subject_as_student(
    client, db_session, test_course, auth_headers
):
    """
    A student should be able to retrieve an individual subject.
    """

    headers = auth_headers(UserRole.STUDENT)

    subject = create_test_subject(db_session, test_course)

    response = client.get(
        f"{SUBJECTS_URL}/{subject.subject_id}",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["subject_id"] == subject.subject_id
    assert data["subject_name"] == subject.subject_name
    assert data["course_id"] == test_course.course_id


def test_get_subject_as_lecturer(
    client, db_session, test_course, auth_headers
):
    """
    A lecturer should be able to retrieve an individual subject.
    """

    headers = auth_headers(UserRole.LECTURER)

    subject = create_test_subject(db_session, test_course)

    response = client.get(
        f"{SUBJECTS_URL}/{subject.subject_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["subject_id"] == subject.subject_id


def test_get_subject_as_admin(
    client, db_session, test_course, auth_headers
):
    """
    An admin should be able to retrieve an individual subject.
    """

    headers = auth_headers(UserRole.ADMIN)

    subject = create_test_subject(db_session, test_course)

    response = client.get(
        f"{SUBJECTS_URL}/{subject.subject_id}",
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["subject_id"] == subject.subject_id


def test_get_missing_subject_returns_404(
    client, auth_headers
):
    """
    Retrieving a subject which does not exist should return 404.
    """

    headers = auth_headers(UserRole.STUDENT)

    response = client.get(
        f"{SUBJECTS_URL}/999999",
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Subject not found."


# -------------------------------------------------------------------------
# GET ALL SUBJECTS
# -------------------------------------------------------------------------


def test_get_subjects_as_student(
    client, db_session, test_course, auth_headers
):
    """
    A student should be able to retrieve all subjects.
    """

    headers = auth_headers(UserRole.STUDENT)

    subject = create_test_subject(db_session, test_course)

    response = client.get(
        SUBJECTS_URL,
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, list)
    assert any(
        item["subject_id"] == subject.subject_id
        for item in data
    )


def test_get_subjects_as_lecturer(
    client, db_session, test_course, auth_headers
):
    """
    A lecturer should be able to retrieve all subjects.
    """

    headers = auth_headers(UserRole.LECTURER)

    subject = create_test_subject(db_session, test_course)

    response = client.get(
        SUBJECTS_URL,
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, list)
    assert any(
        item["subject_id"] == subject.subject_id
        for item in data
    )


def test_get_subjects_as_admin(
    client, db_session, test_course, auth_headers
):
    """
    An admin should be able to retrieve all subjects.
    """

    headers = auth_headers(UserRole.ADMIN)

    subject = create_test_subject(db_session, test_course)

    response = client.get(
        SUBJECTS_URL,
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, list)
    assert any(
        item["subject_id"] == subject.subject_id
        for item in data
    )


# -------------------------------------------------------------------------
# DELETE SUBJECT
# -------------------------------------------------------------------------


def test_delete_subject_as_admin(
    client, db_session, test_course, auth_headers
):
    """
    An admin should be able to delete a subject.
    """

    headers = auth_headers(UserRole.ADMIN)

    subject = create_test_subject(db_session, test_course)

    response = client.delete(
        f"{SUBJECTS_URL}/{subject.subject_id}",
        headers=headers,
    )

    assert response.status_code == 204

    # Verify the subject was deleted from the database.
    deleted_subject = db_session.scalar(
        select(Subject).where(
            Subject.subject_id == subject.subject_id
        )
    )

    assert deleted_subject is None


def test_delete_missing_subject_returns_404(
    client, auth_headers
):
    """
    Deleting a subject which does not exist should return 404.
    """

    headers = auth_headers(UserRole.ADMIN)

    response = client.delete(
        f"{SUBJECTS_URL}/999999",
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Subject not found."


def test_delete_subject_as_student_returns_403(
    client, auth_headers
):
    """
    A student should not be able to delete a subject.
    """

    headers = auth_headers(UserRole.STUDENT)

    response = client.delete(
        f"{SUBJECTS_URL}/999999",
        headers=headers,
    )

    assert response.status_code == 403


def test_delete_subject_as_lecturer_returns_403(
    client, auth_headers
):
    """
    A lecturer should not be able to delete a subject.
    """

    headers = auth_headers(UserRole.LECTURER)

    response = client.delete(
        f"{SUBJECTS_URL}/999999",
        headers=headers,
    )

    assert response.status_code == 403


# -------------------------------------------------------------------------
# AUTHENTICATION
# -------------------------------------------------------------------------


def test_get_subjects_without_authentication(client):
    """
    An unauthenticated request should return 401.
    """

    response = client.get(SUBJECTS_URL)

    assert response.status_code == 401
