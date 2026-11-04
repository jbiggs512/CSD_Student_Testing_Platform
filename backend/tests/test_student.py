def test_outstanding_tests(client):
    """
    Test the outstanding tests endpoint
    """
    response = client.get("/api/v1/student/outstandingTests/1")
    assert response.status_code == 200
