def test_health_check(client):
    """
    Test the health check endpoint in main.py
    """
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_database_health_check(client):
    """
    Test that the database health endpoint can query the database.
    """
    response = client.get("/health/database")

    assert response.status_code == 200
    assert response.json() == {"database": "connected"}