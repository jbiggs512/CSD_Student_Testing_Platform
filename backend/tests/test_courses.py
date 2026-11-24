import uuid

from app.db.models import Course
from app.enums import UserRole


COURSES_URL = "/api/v1/course"


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
    assert set(data[0]) == {"course_id", "course_title"}


def test_get_courses_allows_public_access_for_registration(client):
    response = client.get(COURSES_URL)

    assert response.status_code == 200
    assert any(
        course["course_title"] == "BSc Software Engineering"
        for course in response.json()
    )


def test_admin_can_create_course(client, db_session, auth_headers):
    course_title = f"New Course {uuid.uuid4().hex[:8]}"

    response = client.post(
        COURSES_URL,
        json={"course_title": f"  {course_title}  "},
        headers=auth_headers(UserRole.ADMIN),
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["course_title"] == course_title

    stored_course = db_session.get(Course, data["course_id"])
    assert stored_course is not None
    assert stored_course.course_title == course_title


def test_admin_can_update_course(client, db_session, auth_headers):
    course = Course(course_title=f"Original Course {uuid.uuid4().hex[:8]}")
    db_session.add(course)
    db_session.commit()
    course_title = f"Updated Course {uuid.uuid4().hex[:8]}"

    response = client.patch(
        f"{COURSES_URL}/{course.course_id}",
        json={"course_title": f"  {course_title}  "},
        headers=auth_headers(UserRole.ADMIN),
    )

    assert response.status_code == 200, response.text
    assert response.json() == {
        "course_id": course.course_id,
        "course_title": course_title,
    }

    db_session.refresh(course)
    assert course.course_title == course_title


def test_admin_cannot_create_duplicate_course(client, db_session, auth_headers):
    existing_course = Course(
        course_title=f"Existing Course {uuid.uuid4().hex[:8]}"
    )
    db_session.add(existing_course)
    db_session.commit()

    response = client.post(
        COURSES_URL,
        json={"course_title": existing_course.course_title},
        headers=auth_headers(UserRole.ADMIN),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "A course with this title already exists."
    )


def test_admin_cannot_edit_course_to_duplicate_title(
    client, db_session, auth_headers
):
    existing_course = Course(
        course_title=f"Existing Course {uuid.uuid4().hex[:8]}"
    )
    other_course = Course(course_title=f"Other Course {uuid.uuid4().hex[:8]}")
    db_session.add(other_course)
    db_session.add(existing_course)
    db_session.commit()

    response = client.patch(
        f"{COURSES_URL}/{other_course.course_id}",
        json={"course_title": existing_course.course_title},
        headers=auth_headers(UserRole.ADMIN),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "A course with this title already exists."
    )
