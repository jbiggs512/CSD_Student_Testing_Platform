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
    assert {"course_id", "course_title"} == set(data[0])


def test_get_courses_requires_authentication(client):
    response = client.get(COURSES_URL)

    assert response.status_code == 401
