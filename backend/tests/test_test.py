from app.db.scripts.seed_test import seed_test_data


def test_get_test_data(client, db_session):
    """
    Test that test data can be retrieved 
    """
    
    seed_test_data(db_session)
    response = client.get("/api/v1/test/1")
    assert response.status_code == 200
    body = response.json()
    assert body["course"] == "Sample Course"
    assert body["subject"] == "Sample Subject"
    assert body["testName"] == "Sample Test"
    assert body["description"] == "This is a sample test."
    
def test_get_test_data_not_found(client):
    """
    Test that a 404 error is returned when the test is not found
    """
    
    response = client.get("/api/v1/test/999")
    assert response.status_code == 404
    body = response.json()
    assert body["detail"] == "Test with ID '999' not found."