import pytest

from sqlalchemy import select

from app.db.models import Course
from app.enums import UserRole


COURSES_URL = "/api/v1/course"


@pytest.fixture
def test_course(db_session):
    course = db_session.scalar(
        select(Course).where(
            Course.course_title == "BSc Software Engineering"
        )
    )
    if course is None:
        course = Course(course_title="BSc Software Engineering")
        db_session.add(course)
        db_session.commit()
        db_session.refresh(course)
    return course


def test_get_courses_returns_titles_in_alphabetical_order(
    client, db_session, auth_headers
):
    db_session.add_all(
        [
            Course(course_title="Zoology"),
            Course(course_title="Applied Computing"),
        ]
    )
    db_session.commit()

    response = client.get(
        COURSES_URL,
        headers=auth_headers(UserRole.ADMIN),
    )

    assert response.status_code == 200
    data = response.json()
    titles = [course["course_title"] for course in data]

    assert titles == sorted(titles)
    assert {"course_id", "course_title"} == set(data[0])


def test_get_courses_requires_authentication(client):
    response = client.get(COURSES_URL)

    assert response.status_code == 401


def test_admin_cannot_create_duplicate_course(client, test_course, auth_headers):
    response = client.post(
        COURSES_URL,
        json={"course_title": test_course.course_title},
        headers=auth_headers(UserRole.ADMIN),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "A course with this title already exists."
    )


def test_admin_cannot_edit_course_to_duplicate_title(
    client, db_session, test_course, auth_headers
):
    other_course = Course(course_title="Other Course")
    db_session.add(other_course)
    db_session.commit()

    response = client.patch(
        f"{COURSES_URL}/{other_course.course_id}",
        json={"course_title": test_course.course_title},
        headers=auth_headers(UserRole.ADMIN),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "A course with this title already exists."
    )
