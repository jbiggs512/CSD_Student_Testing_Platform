from app.enums import UserRole

def test_outstanding_tests(client, auth_headers):
    """
    Test the outstanding tests endpoint
    """
    headers = auth_headers(UserRole.STUDENT)
    
    response = client.get("/api/v1/student/outstandingTests/1", headers=headers)
    assert response.status_code == 200

def test_outstanding_tests_returns_401(client):
    """
    Test the outstanding tests endpoint returns unauthorised
    """
    
    response = client.get("/api/v1/student/outstandingTests/1")
    assert response.status_code == 401