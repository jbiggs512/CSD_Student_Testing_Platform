from app.enums import UserRole, AccountStatus
        
def test_create_lecturer_account(client):
    """
    Test that a new lecturer account can be created successfully.
    """
    lecturer_data = {
        "username": "lecturer4",
        "first_name": "John",
        "last_name": "Smith",
        "email": "john.smith4@example.com",
        "password": "SecurePassword123!",
    }

    response = client.post(
        "/api/v1/user/create/lecturer",
        json=lecturer_data,
    )

    assert response.status_code == 201

    data = response.json()
    assert data["username"] == lecturer_data["username"]
    assert data["first_name"] == lecturer_data["first_name"]
    assert data["last_name"] == lecturer_data["last_name"]
    assert data["email"] == lecturer_data["email"]
    assert data["role"] == UserRole.LECTURER.value
    assert data["account_status"] == AccountStatus.ACTIVE.value

    # Ensure the password is never returned by the API.
    assert "password" not in data
    assert "password_hash" not in data