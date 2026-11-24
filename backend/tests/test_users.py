from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.api.v1.user import schemas, service
from app.db.models import Course, Role, User
from app.db.scripts.seed_users import DEFAULT_USERS, seed_users
from app.enums import UserRole, AccountStatus


def test_user_response_serializes_existing_local_email():
    response = schemas.UserResponse.model_validate(
        SimpleNamespace(
            user_id=1,
            username="local.admin",
            first_name="Local",
            last_name="Admin",
            email="admin@altius.local",
            role=SimpleNamespace(role_name=UserRole.ADMIN.value),
            account_status=AccountStatus.ACTIVE,
            registration_date=datetime.now().date(),
            last_login=None,
        )
    )

    assert response.email == "admin@altius.local"


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


def test_create_lecturer_account(client, db_session):
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

    admin = _seed_user(
        db_session,
        username="AD100001",
        role_name=UserRole.ADMIN,
    )
    admin_token = create_access_token(subject=admin.username)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.post(
        "/api/v1/user/lecturer",
        json=lecturer_data,
        headers=admin_headers,
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


def test_create_student_account(client, db_session):
    """
    Test that a new student account is created with pending status and associated course.
    """
    course = db_session.scalar(
        select(Course).where(Course.course_title == "BSc Software Engineering")
    )
    assert course is not None

    student_data = {
        "username": "WS100001",
        "first_name": "Pending",
        "last_name": "Student",
        "email": "ws100001@example.com",
        "password": "SecurePassword123!",
        "courses": [course.course_id],
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

    created_user = db_session.scalar(
        select(User).where(User.username == student_data["username"])
    )
    assert created_user is not None
    assert [c.course_id for c in created_user.courses] == [course.course_id]


def test_lecturer_can_list_students(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100009",
        role_name=UserRole.LECTURER,
    )
    student = _seed_user(
        db_session,
        username="WS100002",
        role_name=UserRole.STUDENT,
    )

    response = client.get(
        "/api/v1/user/student",
        headers={"Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"},
    )

    assert response.status_code == 200
    assert any(user["username"] == student.username for user in response.json())


def test_lecturer_can_edit_student_details_and_status(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100010",
        role_name=UserRole.LECTURER,
    )
    student = _seed_user(
        db_session,
        username="WS100003",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.PENDING,
    )
    headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }

    response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={
            "first_name": "Updated",
            "last_name": "Student",
            "email": "updated.student@example.com",
            "password": "NewSecurePassword123!",
            "account_status": AccountStatus.DISABLED.value,
        },
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Updated"
    assert data["last_name"] == "Student"
    assert data["email"] == "updated.student@example.com"
    assert data["account_status"] == AccountStatus.DISABLED.value
    assert "password" not in data
    assert "password_hash" not in data

    db_session.refresh(student)
    assert verify_password("NewSecurePassword123!", student.password_hash)
    assert student.account_status == AccountStatus.DISABLED


def test_student_update_rejects_duplicate_email(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100015",
        role_name=UserRole.LECTURER,
    )
    student = _seed_user(
        db_session,
        username="WS100009",
        role_name=UserRole.STUDENT,
    )
    other_student = _seed_user(
        db_session,
        username="WS100010",
        role_name=UserRole.STUDENT,
        email="occupied.student@example.com",
    )
    response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"email": other_student.email},
        headers={
            "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered."


def test_student_update_can_leave_account_status_unchanged(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100016",
        role_name=UserRole.LECTURER,
    )
    student = _seed_user(
        db_session,
        username="WS100011",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.ACTIVE,
    )
    response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"first_name": "Updated"},
        headers={
            "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
        },
    )

    assert response.status_code == 200
    assert response.json()["account_status"] == AccountStatus.ACTIVE.value


def test_admin_can_update_lecturer_account_status(client, db_session):
    admin = _seed_user(
        db_session,
        username="AD100004",
        role_name=UserRole.ADMIN,
    )
    lecturer = _seed_user(
        db_session,
        username="LC100017",
        role_name=UserRole.LECTURER,
    )
    response = client.patch(
        f"/api/v1/user/lecturer/{lecturer.username}",
        json={"account_status": AccountStatus.DISABLED.value},
        headers={
            "Authorization": f"Bearer {create_access_token(subject=admin.username)}"
        },
    )

    assert response.status_code == 200
    assert response.json()["account_status"] == AccountStatus.DISABLED.value


def test_lecturer_can_enable_and_disable_student(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100011",
        role_name=UserRole.LECTURER,
    )
    student = _seed_user(
        db_session,
        username="WS100004",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.ACTIVE,
    )
    headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }

    disable_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"account_status": AccountStatus.DISABLED.value},
        headers=headers,
    )
    enable_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"account_status": AccountStatus.ACTIVE.value},
        headers=headers,
    )

    assert disable_response.status_code == 200
    assert disable_response.json()["account_status"] == AccountStatus.DISABLED.value
    assert enable_response.status_code == 200
    assert enable_response.json()["account_status"] == AccountStatus.ACTIVE.value


def test_lecturer_can_delete_student(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100012",
        role_name=UserRole.LECTURER,
    )
    student = _seed_user(
        db_session,
        username="WS100005",
        role_name=UserRole.STUDENT,
    )
    headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }

    response = client.delete(
        f"/api/v1/user/student/{student.username}",
        headers=headers,
    )

    assert response.status_code == 204
    assert db_session.get(User, student.user_id) is None


def test_admin_can_manage_student_accounts(client, db_session, auth_headers):
    headers = auth_headers(UserRole.ADMIN)
    student = _seed_user(
        db_session,
        username="WS_ADMIN_MANAGED",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.PENDING,
    )
    student.failed_login_attempts = 5
    student.locked_until = datetime.now(timezone.utc) + timedelta(minutes=10)
    db_session.commit()

    list_response = client.get("/api/v1/user/student", headers=headers)
    assert list_response.status_code == 200
    assert any(
        account["username"] == student.username
        for account in list_response.json()
    )

    unlock_response = client.patch(
        f"/api/v1/user/student/{student.username}/unlock",
        headers=headers,
    )
    assert unlock_response.status_code == 200
    assert unlock_response.json()["failed_login_attempts"] == 0
    assert unlock_response.json()["locked_until"] is None

    update_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={
            "first_name": "AdminUpdated",
            "account_status": AccountStatus.ACTIVE.value,
        },
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["first_name"] == "AdminUpdated"
    assert update_response.json()["account_status"] == AccountStatus.ACTIVE.value

    disable_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"account_status": AccountStatus.DISABLED.value},
        headers=headers,
    )
    assert disable_response.status_code == 200
    assert disable_response.json()["account_status"] == AccountStatus.DISABLED.value

    delete_response = client.delete(
        f"/api/v1/user/student/{student.username}",
        headers=headers,
    )
    assert delete_response.status_code == 204
    assert db_session.get(User, student.user_id) is None


def test_create_duplicate_student_username_and_email_return_409(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100013",
        role_name=UserRole.LECTURER,
    )
    existing_student = _seed_user(
        db_session,
        username="WS100006",
        role_name=UserRole.STUDENT,
        email="existing.student@example.com",
    )
    headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }
    base_data = {
        "first_name": "New",
        "last_name": "Student",
        "password": "SecurePassword123!",
    }

    duplicate_username_response = client.post(
        "/api/v1/user/student",
        json={
            **base_data,
            "username": existing_student.username,
            "email": "different.student@example.com",
        },
        headers=headers,
    )
    duplicate_email_response = client.post(
        "/api/v1/user/student",
        json={
            **base_data,
            "username": "WS100007",
            "email": existing_student.email,
        },
        headers=headers,
    )

    assert duplicate_username_response.status_code == 409
    assert duplicate_username_response.json()["detail"] == "Username is already in use."
    assert duplicate_email_response.status_code == 409
    assert duplicate_email_response.json()["detail"] == "Email is already registered."


def test_student_management_requires_lecturer_or_admin(client, db_session):
    student = _seed_user(
        db_session,
        username="WS100008",
        role_name=UserRole.STUDENT,
    )
    student_token = create_access_token(subject=student.username)

    unauthenticated_response = client.get("/api/v1/user/student")
    forbidden_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"first_name": "Rejected"},
        headers={"Authorization": f"Bearer {student_token}"},
    )

    assert unauthenticated_response.status_code == 401
    assert forbidden_response.status_code == 403


def test_student_management_returns_404_for_unknown_student(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100014",
        role_name=UserRole.LECTURER,
    )
    headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }

    update_response = client.patch(
        "/api/v1/user/student/UNKNOWN1",
        json={"first_name": "Missing"},
        headers=headers,
    )
    delete_response = client.delete(
        "/api/v1/user/student/UNKNOWN1",
        headers=headers,
    )

    assert update_response.status_code == 404
    assert delete_response.status_code == 404


def test_admin_can_list_edit_and_delete_lecturers(client, db_session):
    admin = _seed_user(
        db_session,
        username="AD100003",
        role_name=UserRole.ADMIN,
        email="admin100003@example.com",
    )
    lecturer = _seed_user(
        db_session,
        username="LC100003",
        role_name=UserRole.LECTURER,
        email="lecturer100003@example.com",
    )
    admin_token = create_access_token(subject=admin.username)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    list_response = client.get(
        "/api/v1/user/lecturer",
        headers=admin_headers,
    )
    assert list_response.status_code == 200
    assert any(
        user["username"] == lecturer.username
        for user in list_response.json()
    )

    update_response = client.patch(
        f"/api/v1/user/lecturer/{lecturer.username}",
        json={
            "first_name": "Updated",
            "last_name": "Lecturer",
            "email": "updated.lecturer100003@example.com",
        },
        headers=admin_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["first_name"] == "Updated"
    assert update_response.json()["email"] == (
        "updated.lecturer100003@example.com"
    )

    delete_response = client.delete(
        f"/api/v1/user/lecturer/{lecturer.username}",
        headers=admin_headers,
    )
    assert delete_response.status_code == 204
    remaining_lecturers = client.get(
        "/api/v1/user/lecturer",
        headers=admin_headers,
    ).json()
    assert all(
        user["username"] != lecturer.username
        for user in remaining_lecturers
    )


def test_admin_can_create_list_edit_and_delete_admin_account(
    client, auth_headers
):
    current_admin_username = "ADMIN_ACCOUNT_LIST"
    headers = auth_headers(UserRole.ADMIN, username=current_admin_username)
    auth_headers(UserRole.LECTURER)
    account_data = {
        "username": "managed.admin",
        "first_name": "Managed",
        "last_name": "Admin",
        "email": "managed.admin@example.com",
        "password": "SecurePassword123!",
        "role": UserRole.ADMIN.value,
    }

    create_response = client.post(
        "/api/v1/user/account",
        json=account_data,
        headers=headers,
    )
    assert create_response.status_code == 201
    assert create_response.json()["role"] == UserRole.ADMIN.value
    assert create_response.json()["account_status"] == AccountStatus.ACTIVE.value

    list_response = client.get("/api/v1/user/account", headers=headers)
    assert list_response.status_code == 200
    assert {user["role"] for user in list_response.json()} >= {
        UserRole.ADMIN.value,
        UserRole.LECTURER.value,
    }
    assert any(
        user["username"] == account_data["username"]
        for user in list_response.json()
    )
    assert all(
        user["username"] != current_admin_username
        for user in list_response.json()
    )

    update_response = client.patch(
        f"/api/v1/user/account/{account_data['username']}",
        json={"first_name": "Updated"},
        headers=headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["first_name"] == "Updated"

    delete_response = client.delete(
        f"/api/v1/user/account/{account_data['username']}",
        headers=headers,
    )
    assert delete_response.status_code == 204


def test_account_management_rejects_student_role_and_requires_admin(
    client, auth_headers
):
    lecturer_headers = auth_headers(UserRole.LECTURER)
    response = client.get("/api/v1/user/account", headers=lecturer_headers)
    assert response.status_code == 403

    admin_headers = auth_headers(UserRole.ADMIN)
    response = client.post(
        "/api/v1/user/account",
        json={
            "username": "invalid.role",
            "first_name": "Invalid",
            "last_name": "Role",
            "email": "invalid.role@example.com",
            "password": "SecurePassword123!",
            "role": UserRole.STUDENT.value,
        },
        headers=admin_headers,
    )
    assert response.status_code == 422


def test_lecturer_management_requires_admin(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC100004",
        role_name=UserRole.LECTURER,
        email="lecturer100004@example.com",
    )
    lecturer_token = create_access_token(subject=lecturer.username)
    lecturer_headers = {"Authorization": f"Bearer {lecturer_token}"}

    response = client.get(
        "/api/v1/user/lecturer",
        headers=lecturer_headers,
    )

    assert response.status_code == 403

    response = client.post(
        "/api/v1/user/lecturer",
        json={
            "username": "LC100005",
            "first_name": "Not",
            "last_name": "Allowed",
            "email": "lecturer100005@example.com",
            "password": "SecurePassword123!",
        },
        headers=lecturer_headers,
    )

    assert response.status_code == 403

    response = client.patch(
        f"/api/v1/user/lecturer/{lecturer.username}",
        json={"first_name": "Not Allowed"},
        headers=lecturer_headers,
    )

    assert response.status_code == 403

    response = client.delete(
        f"/api/v1/user/lecturer/{lecturer.username}",
        headers=lecturer_headers,
    )

    assert response.status_code == 403


def test_lecturer_update_validates_target_and_email(client, db_session):
    admin = _seed_user(
        db_session,
        username="AD100005",
        role_name=UserRole.ADMIN,
        email="admin100005@example.com",
    )
    lecturer = _seed_user(
        db_session,
        username="LC100006",
        role_name=UserRole.LECTURER,
        email="lecturer100006@example.com",
    )
    other_lecturer = _seed_user(
        db_session,
        username="LC100007",
        role_name=UserRole.LECTURER,
        email="lecturer100007@example.com",
    )
    admin_token = create_access_token(subject=admin.username)
    headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.patch(
        "/api/v1/user/lecturer/unknown-lecturer",
        json={"first_name": "Missing"},
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Lecturer not found."

    response = client.patch(
        f"/api/v1/user/lecturer/{lecturer.username}",
        json={"email": other_lecturer.email},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered."

    response = client.patch(
        f"/api/v1/user/lecturer/{lecturer.username}",
        json={"password": "UpdatedPassword123!"},
        headers=headers,
    )
    assert response.status_code == 200
    db_session.refresh(lecturer)
    assert lecturer.password_hash != "UpdatedPassword123!"


def test_lecturer_delete_returns_404_for_unknown_lecturer(client, db_session):
    admin = _seed_user(
        db_session,
        username="AD100006",
        role_name=UserRole.ADMIN,
        email="admin100006@example.com",
    )
    admin_token = create_access_token(subject=admin.username)

    response = client.delete(
        "/api/v1/user/lecturer/unknown-lecturer",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Lecturer not found."


def test_create_user_rejects_missing_role():
    db = Mock()
    db.scalar.return_value = None
    request = schemas.LecturerCreateRequest(
        username="missing.role",
        first_name="Missing",
        last_name="Role",
        email="missing.role@example.com",
        password="SecurePassword123!",
    )

    with pytest.raises(HTTPException) as error:
        service.create_user(db, request)

    assert error.value.status_code == 422
    assert error.value.detail == "Role does not exist."


def test_delete_user_rejects_unknown_role():
    db = Mock()
    target_user = SimpleNamespace(
        username="unknown.role",
        role=SimpleNamespace(role_name="unknown"),
    )
    current_user = SimpleNamespace(
        username="admin",
        role=SimpleNamespace(role_name=UserRole.ADMIN.value),
    )
    db.scalar.return_value = target_user

    with pytest.raises(HTTPException) as error:
        service.delete_user(db, target_user.username, current_user)

    assert error.value.status_code == 403
    assert error.value.detail == "Insufficient permissions to delete this user."


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


def test_delete_lecturer_account(client, db_session):
    """
    Test that an admin can delete a lecturer account and receives 404 for unknown users.
    """
    admin = _seed_user(
        db_session,
        username="AD300001",
        role_name=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    )
    admin_headers = {"Authorization": f"Bearer {create_access_token(subject=admin.username)}"}

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
        headers=admin_headers,
    )
    assert response.status_code == 201

    # Test deleting the lecturer account as an admin
    response = client.delete(
        f"/api/v1/user/{lecturer_data['username']}",
        headers=admin_headers,
    )
    assert response.status_code == 204

    # Test deleting a non-existent lecturer account
    invalid_username = "nonexistent_user"
    response = client.delete(
        f"/api/v1/user/{invalid_username}",
        headers=admin_headers,
    )
    assert response.status_code == 404


def test_delete_user_permissions(client, db_session):
    """
    Test role hierarchy and self-deletion restrictions on DELETE /api/v1/user/{username}.
    """
    admin1 = _seed_user(
        db_session,
        username="AD300002",
        role_name=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    )
    admin2 = _seed_user(
        db_session,
        username="AD300003",
        role_name=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
    )
    lecturer1 = _seed_user(
        db_session,
        username="LC300001",
        role_name=UserRole.LECTURER,
        account_status=AccountStatus.ACTIVE,
    )
    lecturer2 = _seed_user(
        db_session,
        username="LC300002",
        role_name=UserRole.LECTURER,
        account_status=AccountStatus.ACTIVE,
    )
    student1 = _seed_user(
        db_session,
        username="WS300001",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.ACTIVE,
    )
    student2 = _seed_user(
        db_session,
        username="WS300002",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.ACTIVE,
    )

    admin1_headers = {"Authorization": f"Bearer {create_access_token(subject=admin1.username)}"}
    lecturer1_headers = {"Authorization": f"Bearer {create_access_token(subject=lecturer1.username)}"}
    student1_headers = {"Authorization": f"Bearer {create_access_token(subject=student1.username)}"}

    # Unauthenticated -> 401
    unauth_resp = client.delete(f"/api/v1/user/{student2.username}")
    assert unauth_resp.status_code == 401

    # Self-deletion -> 403
    self_delete_resp = client.delete(
        f"/api/v1/user/{admin1.username}",
        headers=admin1_headers,
    )
    assert self_delete_resp.status_code == 403
    assert self_delete_resp.json()["detail"] == "Users cannot delete their own account."

    # Student cannot delete another student -> 403
    student_delete_resp = client.delete(
        f"/api/v1/user/{student2.username}",
        headers=student1_headers,
    )
    assert student_delete_resp.status_code == 403
    assert student_delete_resp.json()["detail"] == "Only lecturers or admins can delete student accounts."

    # Lecturer cannot delete another lecturer -> 403
    lecturer_delete_lecturer_resp = client.delete(
        f"/api/v1/user/{lecturer2.username}",
        headers=lecturer1_headers,
    )
    assert lecturer_delete_lecturer_resp.status_code == 403
    assert lecturer_delete_lecturer_resp.json()["detail"] == "Only admins can delete lecturer accounts."

    # Lecturer cannot delete an admin -> 403
    lecturer_delete_admin_resp = client.delete(
        f"/api/v1/user/{admin2.username}",
        headers=lecturer1_headers,
    )
    assert lecturer_delete_admin_resp.status_code == 403
    assert lecturer_delete_admin_resp.json()["detail"] == "Only admins can delete admin accounts."

    # Lecturer can delete a student -> 204
    lecturer_delete_student_resp = client.delete(
        f"/api/v1/user/{student2.username}",
        headers=lecturer1_headers,
    )
    assert lecturer_delete_student_resp.status_code == 204

    # Admin can delete another admin -> 204
    admin_delete_admin_resp = client.delete(
        f"/api/v1/user/{admin2.username}",
        headers=admin1_headers,
    )
    assert admin_delete_admin_resp.status_code == 204

def test_create_lecturer_duplicate_email_returns_409(client, db_session):
    """
    Test that creating a lecturer with an existing email returns 409.
    """

    lecturer_data = {
        "username": "first.lecturer",
        "first_name": "First",
        "last_name": "Lecturer",
        "email": "duplicate.email@example.com",
        "password": "SecurePassword123!",
    }

    admin = _seed_user(
        db_session,
        username="AD400001",
        role_name=UserRole.ADMIN,
    )
    admin_token = create_access_token(subject=admin.username)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.post(
        "/api/v1/user/lecturer",
        json=lecturer_data,
        headers=admin_headers,
    )

    assert response.status_code == 201

    # Attempt to create another lecturer with the same email.
    duplicate_data = {
        "username": "second.lecturer",
        "first_name": "Second",
        "last_name": "Lecturer",
        "email": "duplicate.email@example.com",
        "password": "SecurePassword123!",
    }

    response = client.post(
        "/api/v1/user/lecturer",
        json=duplicate_data,
        headers=admin_headers,
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Email is already registered."


def test_create_lecturer_duplicate_username_returns_409(client, db_session):
    """
    Test that creating a lecturer with an existing username returns 409.
    """

    lecturer_data = {
        "username": "duplicate.lecturer",
        "first_name": "First",
        "last_name": "Lecturer",
        "email": "first.lecturer@example.com",
        "password": "SecurePassword123!",
    }

    admin = _seed_user(
        db_session,
        username="AD400002",
        role_name=UserRole.ADMIN,
    )
    admin_token = create_access_token(subject=admin.username)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    response = client.post(
        "/api/v1/user/lecturer",
        json=lecturer_data,
        headers=admin_headers,
    )

    assert response.status_code == 201

    # Attempt to create another lecturer with the same username.
    duplicate_data = {
        "username": "duplicate.lecturer",
        "first_name": "Second",
        "last_name": "Lecturer",
        "email": "second.lecturer@example.com",
        "password": "SecurePassword123!",
    }

    response = client.post(
        "/api/v1/user/lecturer",
        json=duplicate_data,
        headers=admin_headers,
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Username is already in use."

def test_seed_users_is_idempotent(db_session):
    """
    Test that seed_users creates the default admin, lecturer, approved student,
    and pending student accounts, and is idempotent on subsequent runs.
    """
    seed_users(db_session)
    db_session.commit()

    # Running a second time should skip existing users without error.
    seed_users(db_session)
    db_session.commit()

    for spec in DEFAULT_USERS:
        user = db_session.scalar(select(User).where(User.username == spec.username))
        assert user is not None
        assert user.email == spec.email
        assert user.role.role_name == spec.role.value
        assert user.account_status == spec.account_status


def test_list_students_includes_and_filters_by_course(client, db_session):
    se_course = db_session.scalar(
        select(Course).where(Course.course_title == "BSc Software Engineering")
    )
    cs_course = db_session.scalar(
        select(Course).where(Course.course_title == "BSc Computer Science")
    )
    assert se_course is not None
    assert cs_course is not None

    lecturer = _seed_user(
        db_session,
        username="LC500001",
        role_name=UserRole.LECTURER,
    )
    se_student = _seed_user(
        db_session,
        username="WS500001",
        role_name=UserRole.STUDENT,
    )
    cs_student = _seed_user(
        db_session,
        username="WS500002",
        role_name=UserRole.STUDENT,
    )
    se_student.courses = [se_course]
    cs_student.courses = [cs_course]
    db_session.commit()

    headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }

    all_response = client.get("/api/v1/user/student", headers=headers)
    assert all_response.status_code == 200
    all_by_username = {item["username"]: item for item in all_response.json()}
    assert all_by_username[se_student.username]["courses"] == [
        {"course_id": se_course.course_id, "course_title": se_course.course_title}
    ]
    assert all_by_username[cs_student.username]["courses"] == [
        {"course_id": cs_course.course_id, "course_title": cs_course.course_title}
    ]

    filtered_response = client.get(
        f"/api/v1/user/student?course_id={se_course.course_id}",
        headers=headers,
    )
    assert filtered_response.status_code == 200
    filtered_usernames = {item["username"] for item in filtered_response.json()}
    assert se_student.username in filtered_usernames
    assert cs_student.username not in filtered_usernames


def test_lecturer_can_update_and_clear_student_course(client, db_session):
    se_course = db_session.scalar(
        select(Course).where(Course.course_title == "BSc Software Engineering")
    )
    cs_course = db_session.scalar(
        select(Course).where(Course.course_title == "BSc Computer Science")
    )
    assert se_course is not None
    assert cs_course is not None

    lecturer = _seed_user(
        db_session,
        username="LC500002",
        role_name=UserRole.LECTURER,
    )
    student = _seed_user(
        db_session,
        username="WS500003",
        role_name=UserRole.STUDENT,
    )
    student.courses = [se_course]
    db_session.commit()

    headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }

    reassign_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"courses": [cs_course.course_id]},
        headers=headers,
    )
    assert reassign_response.status_code == 200
    assert reassign_response.json()["courses"] == [
        {"course_id": cs_course.course_id, "course_title": cs_course.course_title}
    ]

    # Updating unrelated fields when omitting 'courses' must preserve assignment.
    status_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"first_name": "Preserved"},
        headers=headers,
    )
    assert status_response.status_code == 200
    assert status_response.json()["courses"] == [
        {"course_id": cs_course.course_id, "course_title": cs_course.course_title}
    ]

    # Explicit empty list clears assigned courses.
    clear_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"courses": []},
        headers=headers,
    )
    assert clear_response.status_code == 200
    assert clear_response.json()["courses"] == []


def test_student_course_validation_rejects_missing_course(client, db_session):
    lecturer = _seed_user(
        db_session,
        username="LC500003",
        role_name=UserRole.LECTURER,
    )
    student = _seed_user(
        db_session,
        username="WS500004",
        role_name=UserRole.STUDENT,
    )
    headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }

    update_response = client.patch(
        f"/api/v1/user/student/{student.username}",
        json={"courses": [999999]},
        headers=headers,
    )
    assert update_response.status_code == 400
    assert update_response.json()["detail"] == service.COURSE_NOT_FOUND_DETAIL

    create_response = client.post(
        "/api/v1/user/student",
        json={
            "username": "WS500005",
            "first_name": "Invalid",
            "last_name": "Course",
            "email": "invalid.course@example.com",
            "password": "SecurePassword123!",
            "courses": [999999],
        },
    )
    assert create_response.status_code == 400
    assert create_response.json()["detail"] == service.COURSE_NOT_FOUND_DETAIL


def test_unlock_student_clears_lockout_and_allows_login(client, db_session):
    lecturer = _seed_user(db_session, username="LC900001", role_name=UserRole.LECTURER)
    student = _seed_user(
        db_session,
        username="WS900001",
        role_name=UserRole.STUDENT,
        password="StudentPass123!",
    )
    other_student = _seed_user(
        db_session, username="WS900002", role_name=UserRole.STUDENT
    )

    lecturer_headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }
    student_headers = {
        "Authorization": f"Bearer {create_access_token(subject=other_student.username)}"
    }

    for _ in range(5):
        client.post(
            "/api/v1/auth/login",
            json={"username": student.username, "password": "WrongPassword!"},
        )

    listed = client.get("/api/v1/user/student", headers=lecturer_headers)
    assert listed.status_code == 200
    matched = next(item for item in listed.json() if item["username"] == student.username)
    assert matched["failed_login_attempts"] == 5
    assert matched["locked_until"] is not None

    forbidden = client.patch(
        f"/api/v1/user/student/{student.username}/unlock",
        headers=student_headers,
    )
    assert forbidden.status_code == 403

    not_found = client.patch(
        "/api/v1/user/student/UNKNOWN99/unlock",
        headers=lecturer_headers,
    )
    assert not_found.status_code == 404

    unlocked = client.patch(
        f"/api/v1/user/student/{student.username}/unlock",
        headers=lecturer_headers,
    )
    assert unlocked.status_code == 200
    body = unlocked.json()
    assert body["failed_login_attempts"] == 0
    assert body["locked_until"] is None

    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": student.username, "password": "StudentPass123!"},
    )
    assert login_res.status_code == 200


def test_unlock_lecturer_and_password_reset_clear_lockout(client, db_session):
    admin = _seed_user(db_session, username="AD900001", role_name=UserRole.ADMIN)
    lecturer = _seed_user(
        db_session,
        username="LC900002",
        role_name=UserRole.LECTURER,
        password="LecturerPass123!",
    )
    student = _seed_user(db_session, username="WS900003", role_name=UserRole.STUDENT)

    admin_headers = {
        "Authorization": f"Bearer {create_access_token(subject=admin.username)}"
    }
    lecturer_headers = {
        "Authorization": f"Bearer {create_access_token(subject=lecturer.username)}"
    }
    student_headers = {
        "Authorization": f"Bearer {create_access_token(subject=student.username)}"
    }

    lecturer.failed_login_attempts = 5
    lecturer.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
    db_session.commit()

    assert (
        client.patch(
            f"/api/v1/user/lecturer/{lecturer.username}/unlock",
            headers=lecturer_headers,
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/v1/user/lecturer/{lecturer.username}/unlock",
            headers=student_headers,
        ).status_code
        == 403
    )
    assert (
        client.patch(
            "/api/v1/user/lecturer/UNKNOWN99/unlock",
            headers=admin_headers,
        ).status_code
        == 404
    )

    unlocked = client.patch(
        f"/api/v1/user/lecturer/{lecturer.username}/unlock",
        headers=admin_headers,
    )
    assert unlocked.status_code == 200
    assert unlocked.json()["failed_login_attempts"] == 0
    assert unlocked.json()["locked_until"] is None

    # Password reset should also unlock a locked account
    lecturer.failed_login_attempts = 5
    lecturer.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
    db_session.commit()

    reset_res = client.patch(
        f"/api/v1/user/lecturer/{lecturer.username}",
        json={"password": "NewLecturerPass123!"},
        headers=admin_headers,
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["failed_login_attempts"] == 0
    assert reset_res.json()["locked_until"] is None

    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": lecturer.username, "password": "NewLecturerPass123!"},
        ).status_code
        == 200
    )
