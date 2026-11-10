from sqlalchemy import select

from app.db.models import Role, Test, User
from app.db.scripts.seed_test import seed_test_data
from app.enums import UserRole


def test_get_test_data(client, db_session, auth_headers):
    """
    Test that test data can be retrieved 
    """
    
    seed_test_data(db_session)
    test = db_session.scalar(
        select(Test).where(Test.test_name == "OOP Key Principles")
    )
    assert test is not None

    headers = auth_headers(UserRole.STUDENT)
    student = db_session.scalar(
        select(User)
        .join(Role, User.role_id == Role.role_id)
        .where(Role.role_name == UserRole.STUDENT.value)
        .order_by(User.user_id.desc())
    )
    assert student is not None

    student.courses.append(test.subject.course)
    db_session.commit()

    response = client.get(f"/api/v1/test/{test.test_id}", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["course"] == "BSc Software Engineering"
    assert body["subject"] == "Object Oriented Programming"
    assert body["test_name"] == "OOP Key Principles"
    assert body["description"] == "This is a quick test on the key principles of OOP."
    assert body["questions_per_attempt"] == 5
    assert body["current_question"] == 1
    assert len(body["questions"]) == 5
    
def test_get_test_data_not_found(client, auth_headers):
    """
    Test that a 404 error is returned when the test is not found
    """
    
    headers = auth_headers(UserRole.STUDENT)
    response = client.get("/api/v1/test/999", headers=headers)
    assert response.status_code == 404
    body = response.json()
    assert body["detail"] == "Test with ID '999' not found."


def test_get_test_data_requires_authentication(client):
    response = client.get("/api/v1/test/1")

    assert response.status_code == 401