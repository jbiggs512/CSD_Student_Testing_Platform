from app.enums import UserRole, AccountStatus
        
def test_create_lecturer_account(client):
    """
    Test that a new lecturer account can be created successfully.
    """

    lecturer_data = {
        "username": "create.lecturer",
        "first_name": "Create",
        "last_name": "Lecturer",
        "email": "create.lecturer@example.com",
        "password": "SecurePassword123!",
    }

    response = client.post(
        "/api/v1/user/lecturer",
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

def test_delete_lecturer_account(client):
    """
    Test that a lecturer account can be deleted successfully.
    """

    lecturer_data = {
        "username": "delete.lecturer",
        "first_name": "Delete",
        "last_name": "User",
        "email": "delete.user@example.com",
        "password": "SecurePassword123!",
    }

    response = client.post(
        "/api/v1/user/lecturer",
        json=lecturer_data,
    )
    assert response.status_code == 201

    # Test deleting the lecturer account
    response = client.delete(f"/api/v1/user/lecturer/{lecturer_data['username']}")
    assert response.status_code == 204

    # Test deleting a non-existent lecturer account
    invalid_username = "nonexistent_user"
    response = client.delete(f"/api/v1/user/lecturer/{invalid_username}")
    assert response.status_code == 404