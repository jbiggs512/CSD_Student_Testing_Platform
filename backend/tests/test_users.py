from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password
from app.db.models import Role, User
from app.enums import UserRole, AccountStatus


def _seed_user(
    db: Session,
    *,
    username: str,
    role_name: UserRole,
    account_status: AccountStatus = AccountStatus.ACTIVE,
    email: str | None = None,
    first_name: str = "Test",
    last_name: str = "User",
    password: str = "SecurePassword123!",
) -> User:
    role = db.scalar(select(Role).where(Role.role_name == role_name.value))
    assert role is not None

    user = User(
        username=username,
        first_name=first_name,
        last_name=last_name,
        email=email or f"{username.lower()}@example.com",
        password_hash=hash_password(password),
        role_id=role.role_id,
        account_status=account_status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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


def test_create_student_account(client):
    """
    Test that a new student account is created with pending status.
    """
    student_data = {
        "username": "WS100001",
        "first_name": "Pending",
        "last_name": "Student",
        "email": "ws100001@example.com",
        "password": "SecurePassword123!",
    }

    response = client.post(
        "/api/v1/user/student",
        json=student_data,
    )

    assert response.status_code == 201

    data = response.json()
    assert data["username"] == student_data["username"]
    assert data["first_name"] == student_data["first_name"]
    assert data["last_name"] == student_data["last_name"]
    assert data["email"] == student_data["email"]
    assert data["role"] == UserRole.STUDENT.value
    assert data["account_status"] == AccountStatus.PENDING.value
    assert "password" not in data
    assert "password_hash" not in data


def test_approve_student_account_by_lecturer(client, db_session):
    """
    Test that an authenticated lecturer can approve a pending student account.
    """
    lecturer = _seed_user(
        db_session,
        username="LC200001",
        role_name=UserRole.LECTURER,
        account_status=AccountStatus.ACTIVE,
    )
    student = _seed_user(
        db_session,
        username="WS200001",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.PENDING,
    )
    token = create_access_token(subject=lecturer.username)

    response = client.patch(
        f"/api/v1/user/student/{student.username}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == student.username
    assert data["role"] == UserRole.STUDENT.value
    assert data["account_status"] == AccountStatus.ACTIVE.value

    db_session.refresh(student)
    assert student.account_status == AccountStatus.ACTIVE


def test_approve_student_account_by_admin(client, db_session):
    """
    Test that an authenticated admin can approve a pending student account.
    """
    admin = _seed_user(
        db_session,
        username="AD200001",
        role_name=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    )
    student = _seed_user(
        db_session,
        username="WS200002",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.PENDING,
    )
    token = create_access_token(subject=admin.username)

    response = client.patch(
        f"/api/v1/user/student/{student.username}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["account_status"] == AccountStatus.ACTIVE.value


def test_approve_student_account_rejects_unauthenticated_and_student_caller(client, db_session):
    """
    Test that unauthenticated requests return 401 and student callers return 403.
    """
    active_student = _seed_user(
        db_session,
        username="WS200003",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.ACTIVE,
    )
    pending_student = _seed_user(
        db_session,
        username="WS200004",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.PENDING,
    )

    unauth_resp = client.patch(f"/api/v1/user/student/{pending_student.username}/approve")
    assert unauth_resp.status_code == 401

    student_token = create_access_token(subject=active_student.username)
    forbidden_resp = client.patch(
        f"/api/v1/user/student/{pending_student.username}/approve",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert forbidden_resp.status_code == 403
    assert forbidden_resp.json()["detail"] == "Only lecturers or admins can approve student accounts."


def test_approve_student_account_validates_target_user_state(client, db_session):
    """
    Test 404 for unknown user, 400 for non-student user, and 409 for non-pending student.
    """
    lecturer = _seed_user(
        db_session,
        username="LC200002",
        role_name=UserRole.LECTURER,
        account_status=AccountStatus.ACTIVE,
    )
    active_student = _seed_user(
        db_session,
        username="WS200005",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.ACTIVE,
    )
    disabled_student = _seed_user(
        db_session,
        username="WS200006",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.DISABLED,
    )
    token = create_access_token(subject=lecturer.username)
    headers = {"Authorization": f"Bearer {token}"}

    # Non-existent user -> 404
    not_found_resp = client.patch(
        "/api/v1/user/student/UNKNOWN1/approve",
        headers=headers,
    )
    assert not_found_resp.status_code == 404

    # Non-student account -> 400
    non_student_resp = client.patch(
        f"/api/v1/user/student/{lecturer.username}/approve",
        headers=headers,
    )
    assert non_student_resp.status_code == 400
    assert non_student_resp.json()["detail"] == f"User '{lecturer.username}' is not a student account."

    # Already active student -> 409
    already_active_resp = client.patch(
        f"/api/v1/user/student/{active_student.username}/approve",
        headers=headers,
    )
    assert already_active_resp.status_code == 409
    assert already_active_resp.json()["detail"] == f"Student account '{active_student.username}' is not pending approval."

    # Disabled student -> 409
    disabled_resp = client.patch(
        f"/api/v1/user/student/{disabled_student.username}/approve",
        headers=headers,
    )
    assert disabled_resp.status_code == 409


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
    response = client.delete(f"/api/v1/user/{lecturer_data['username']}")
    assert response.status_code == 204

    # Test deleting a non-existent lecturer account
    invalid_username = "nonexistent_user"
    response = client.delete(f"/api/v1/user/{invalid_username}")
    assert response.status_code == 404
