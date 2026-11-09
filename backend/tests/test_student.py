from sqlalchemy import select

from app.enums import UserRole
from app.db.models import Role, Test, User
from app.db.scripts.seed_test_attempt import seed_test_attempt_data

def test_outstanding_tests(client, auth_headers):
    """
    Test the outstanding tests endpoint
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/outstandingTests", headers=headers)
    assert response.status_code == 200

def test_outstanding_tests_returns_401(client):
    """
    Test the outstanding tests endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/outstandingTests")
    assert response.status_code == 401
    
def test_completed_tests(client, auth_headers):
    """
    Test the completed tests endpoint
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/completedTests", headers=headers)
    assert response.status_code == 200

def test_completed_tests_returns_401(client):
    """
    Test the completed tests endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/completedTests")
    assert response.status_code == 401

def test_cohort_rank_returns_404(client, auth_headers):
    """
    Test the cohort rank endpoint returns not found when user has no results
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/cohortRank", headers=headers)
    assert response.status_code == 404

def test_cohort_rank(client, db_session, auth_headers):
    """
    Test the cohort rank endpoint 
    """
    
    seed_test_attempt_data(db_session)
    
    headers = auth_headers(UserRole.STUDENT)
    student = db_session.scalar(
        select(User)
        .join(Role, User.role_id == Role.role_id)
        .where(Role.role_name == UserRole.STUDENT.value)
        .order_by(User.user_id.desc())
    )
    test = db_session.scalar(
        select(Test).where(Test.test_name == "Intro to Artificial Intelligence")
    )
    assert student is not None
    assert test is not None

    student.courses.append(test.subject.course)
    db_session.commit()
    
    response = client.get("/api/v1/student/cohortRank", headers=headers)
    assert response.status_code == 200
    
def test_cohort_rank_returns_401(client):
    """
    Test the cohort rank endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/cohortRank")
    assert response.status_code == 401