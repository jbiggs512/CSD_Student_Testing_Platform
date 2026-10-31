from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models import Role, User
from app.enums import AccountStatus, UserRole


def _seed_user(
    db: Session,
    *,
    username: str = "WS123456",
    password: str = "SecurePassword123!",
    role_name: UserRole = UserRole.STUDENT,
    account_status: AccountStatus = AccountStatus.ACTIVE,
    email: str = "student@weston.ac.uk",
    first_name: str = "Test",
    last_name: str = "Student",
) -> User:
    role = db.scalar(select(Role).where(Role.role_name == role_name.value))
    assert role is not None

    user = User(
        username=username,
        first_name=first_name,
        last_name=last_name,
        email=email,
        password_hash=hash_password(password),
        role_id=role.role_id,
        account_status=account_status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_password_hashing_and_verification():
    plain = "MySecretPass!99"
    hashed = hash_password(plain)

    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPass!", hashed) is False
    assert verify_password(plain, "not-a-valid-argon2-hash") is False


def test_jwt_create_and_decode_round_trip():
    access_token = create_access_token(
        subject="WS123456",
        expires_delta=timedelta(minutes=15),
    )
    access_payload = decode_token(access_token)
    assert access_payload["sub"] == "WS123456"
    assert access_payload["type"] == TOKEN_TYPE_ACCESS
    assert "jti" in access_payload
    assert "exp" in access_payload
    assert "iat" in access_payload

    refresh_token = create_refresh_token(
        subject="WS123456",
        expires_delta=timedelta(days=1),
    )
    refresh_payload = decode_token(refresh_token)
    assert refresh_payload["sub"] == "WS123456"
    assert refresh_payload["type"] == TOKEN_TYPE_REFRESH
    assert "jti" in refresh_payload


def test_created_lecturer_hashes_password_and_can_login(client, db_session):
    lecturer_payload = {
        "username": "LC100001",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "email": "ada.lovelace@weston.ac.uk",
        "password": "LecturerPassword123!",
    }

    create_resp = client.post("/api/v1/user/lecturer", json=lecturer_payload)
    assert create_resp.status_code == 201

    stored_user = db_session.scalar(
        select(User).where(User.username == lecturer_payload["username"])
    )
    assert stored_user is not None
    assert stored_user.password_hash != lecturer_payload["password"]
    assert stored_user.last_login is None

    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "username": lecturer_payload["username"],
            "password": lecturer_payload["password"],
        },
    )
    assert login_resp.status_code == 200
    body = login_resp.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert len(body["access_token"]) > 0
    assert "refresh_token" not in body
    assert body["user"]["username"] == lecturer_payload["username"]
    assert body["user"]["role"] == UserRole.LECTURER.value
    assert body["user"]["last_login"] is not None
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]

    set_cookie_header = login_resp.headers.get("set-cookie", "")
    assert f"{settings.REFRESH_TOKEN_COOKIE_NAME}=" in set_cookie_header
    assert "HttpOnly" in set_cookie_header
    assert "Path=/api/v1/auth" in set_cookie_header


def test_login_active_student_updates_last_login(client, db_session):
    user = _seed_user(
        db_session,
        username="WS654321",
        password="StudentPassword123!",
        role_name=UserRole.STUDENT,
        account_status=AccountStatus.ACTIVE,
    )
    assert user.last_login is None

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "WS654321", "password": "StudentPassword123!"},
    )
    assert response.status_code == 200

    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "WS654321"
    assert data["user"]["role"] == UserRole.STUDENT.value
    assert data["user"]["account_status"] == AccountStatus.ACTIVE.value
    assert data["user"]["last_login"] is not None

    db_session.refresh(user)
    assert user.last_login is not None


def test_login_unknown_username_returns_401(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "UNKNOWN1", "password": "SomePassword123!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."
    assert response.headers.get("WWW-Authenticate") == "Bearer"


def test_login_wrong_password_returns_401(client, db_session):
    user = _seed_user(db_session, username="WS111111", password="CorrectPassword1!")

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "WS111111", "password": "WrongPassword1!"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."

    db_session.refresh(user)
    assert user.last_login is None


def test_login_pending_account_returns_403(client, db_session):
    user = _seed_user(
        db_session,
        username="WS222222",
        password="PendingPassword1!",
        account_status=AccountStatus.PENDING,
        email="pending@weston.ac.uk",
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "WS222222", "password": "PendingPassword1!"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is pending approval."

    db_session.refresh(user)
    assert user.last_login is None


def test_login_disabled_account_returns_403(client, db_session):
    user = _seed_user(
        db_session,
        username="WS333333",
        password="DisabledPassword1!",
        account_status=AccountStatus.DISABLED,
        email="disabled@weston.ac.uk",
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "WS333333", "password": "DisabledPassword1!"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Account has been disabled."

    db_session.refresh(user)
    assert user.last_login is None


def test_login_empty_fields_returns_422(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "", "password": ""},
    )
    assert response.status_code == 422


def test_oauth2_form_token_login(client, db_session):
    _seed_user(
        db_session,
        username="AD000001",
        password="AdminPassword123!",
        role_name=UserRole.ADMIN,
        account_status=AccountStatus.ACTIVE,
        email="admin@weston.ac.uk",
    )

    response = client.post(
        "/api/v1/auth/token",
        data={"username": "AD000001", "password": "AdminPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "AD000001"
    assert data["user"]["role"] == UserRole.ADMIN.value
    assert settings.REFRESH_TOKEN_COOKIE_NAME in response.cookies


def test_refresh_cookie_rotates_tokens_and_logout_clears_cookie(client, db_session):
    _seed_user(
        db_session,
        username="WS888888",
        password="RefreshPassword1!",
        email="refresh@weston.ac.uk",
    )

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "WS888888", "password": "RefreshPassword1!"},
    )
    assert login_resp.status_code == 200
    initial_access_token = login_resp.json()["access_token"]
    initial_refresh_cookie = login_resp.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)
    assert initial_refresh_cookie is not None

    # Refresh uses the HttpOnly cookie automatically from the client cookie jar
    refresh_resp = client.post("/api/v1/auth/refresh")
    assert refresh_resp.status_code == 200
    refresh_body = refresh_resp.json()
    new_access_token = refresh_body["access_token"]
    rotated_refresh_cookie = refresh_resp.cookies.get(settings.REFRESH_TOKEN_COOKIE_NAME)

    assert new_access_token != initial_access_token
    assert rotated_refresh_cookie is not None
    assert rotated_refresh_cookie != initial_refresh_cookie
    assert refresh_body["user"]["username"] == "WS888888"

    # Verify the new access token authenticates /me
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {new_access_token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "WS888888"

    # Logout clears the refresh cookie
    logout_resp = client.post("/api/v1/auth/logout")
    assert logout_resp.status_code == 204
    assert "Max-Age=0" in logout_resp.headers.get("set-cookie", "")

    # Subsequent refresh fails because the cookie was cleared
    after_logout_resp = client.post("/api/v1/auth/refresh")
    assert after_logout_resp.status_code == 401
    assert after_logout_resp.json()["detail"] == "Refresh token missing."


def test_refresh_rejects_missing_or_invalid_cookies(client, db_session):
    _seed_user(
        db_session,
        username="WS999999",
        password="ValidPassword123!",
        email="refreshinvalid@weston.ac.uk",
    )

    # Missing cookie
    missing_resp = client.post("/api/v1/auth/refresh")
    assert missing_resp.status_code == 401
    assert missing_resp.json()["detail"] == "Refresh token missing."

    # Malformed token in cookie
    client.cookies.set(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        "malformed.jwt.value",
        path="/api/v1/auth",
    )
    malformed_resp = client.post("/api/v1/auth/refresh")
    assert malformed_resp.status_code == 401
    assert malformed_resp.json()["detail"] == "Invalid or expired refresh token."

    # Expired refresh token in cookie
    expired_refresh = create_refresh_token(
        subject="WS999999",
        expires_delta=timedelta(seconds=-10),
    )
    client.cookies.set(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        expired_refresh,
        path="/api/v1/auth",
    )
    expired_resp = client.post("/api/v1/auth/refresh")
    assert expired_resp.status_code == 401

    # Access token misused as a refresh cookie (token type confusion check)
    access_token = create_access_token(subject="WS999999")
    client.cookies.set(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        access_token,
        path="/api/v1/auth",
    )
    wrong_type_resp = client.post("/api/v1/auth/refresh")
    assert wrong_type_resp.status_code == 401

    # Refresh token with empty subject
    empty_sub_refresh = create_refresh_token(subject="")
    client.cookies.set(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        empty_sub_refresh,
        path="/api/v1/auth",
    )
    empty_sub_resp = client.post("/api/v1/auth/refresh")
    assert empty_sub_resp.status_code == 401

    # Refresh token for deleted / non-existent user
    ghost_refresh = create_refresh_token(subject="GHOST999")
    client.cookies.set(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        ghost_refresh,
        path="/api/v1/auth",
    )
    ghost_resp = client.post("/api/v1/auth/refresh")
    assert ghost_resp.status_code == 401


def test_refresh_rejects_disabled_or_pending_accounts(client, db_session):
    user = _seed_user(
        db_session,
        username="WS765432",
        password="ValidPassword123!",
        account_status=AccountStatus.ACTIVE,
        email="refreshstatus@weston.ac.uk",
    )
    refresh_token = create_refresh_token(subject=user.username)
    client.cookies.set(
        settings.REFRESH_TOKEN_COOKIE_NAME,
        refresh_token,
        path="/api/v1/auth",
    )

    user.account_status = AccountStatus.DISABLED
    db_session.commit()

    disabled_resp = client.post("/api/v1/auth/refresh")
    assert disabled_resp.status_code == 403
    assert disabled_resp.json()["detail"] == "Account has been disabled."

    user.account_status = AccountStatus.PENDING
    db_session.commit()

    pending_resp = client.post("/api/v1/auth/refresh")
    assert pending_resp.status_code == 403
    assert pending_resp.json()["detail"] == "Account is pending approval."


def test_me_endpoint_returns_authenticated_user(client, db_session):
    _seed_user(
        db_session,
        username="WS444444",
        password="ValidPassword123!",
        email="me@weston.ac.uk",
    )

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "WS444444", "password": "ValidPassword123!"},
    )
    token = login_resp.json()["access_token"]

    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "WS444444"
    assert me_data["email"] == "me@weston.ac.uk"
    assert me_data["role"] == UserRole.STUDENT.value


def test_me_endpoint_rejects_missing_or_invalid_tokens(client, db_session):
    _seed_user(
        db_session,
        username="WS555555",
        password="ValidPassword123!",
        email="tokencheck@weston.ac.uk",
    )

    # Missing Authorization header
    no_auth_resp = client.get("/api/v1/auth/me")
    assert no_auth_resp.status_code == 401

    # Malformed token
    bad_token_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer malformed.jwt.token"},
    )
    assert bad_token_resp.status_code == 401
    assert bad_token_resp.json()["detail"] == "Could not validate credentials."

    # Refresh token misused as Bearer access token
    refresh_token = create_refresh_token(subject="WS555555")
    refresh_as_access_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert refresh_as_access_resp.status_code == 401

    # Expired token
    expired_token = create_access_token(
        subject="WS555555",
        expires_delta=timedelta(seconds=-10),
    )
    expired_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert expired_resp.status_code == 401

    # Empty subject claim
    empty_sub_token = create_access_token(subject="")
    empty_sub_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {empty_sub_token}"},
    )
    assert empty_sub_resp.status_code == 401

    # Token for non-existent / deleted user
    ghost_token = create_access_token(subject="GHOST999")
    ghost_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {ghost_token}"},
    )
    assert ghost_resp.status_code == 401


def test_me_endpoint_rejects_disabled_or_pending_user_tokens(client, db_session):
    user = _seed_user(
        db_session,
        username="WS777777",
        password="ValidPassword123!",
        account_status=AccountStatus.ACTIVE,
        email="statuschange@weston.ac.uk",
    )
    token = create_access_token(subject=user.username)

    # Account subsequently disabled
    user.account_status = AccountStatus.DISABLED
    db_session.commit()

    disabled_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert disabled_resp.status_code == 403
    assert disabled_resp.json()["detail"] == "Account has been disabled."

    # Account set to pending
    user.account_status = AccountStatus.PENDING
    db_session.commit()

    pending_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert pending_resp.status_code == 403
    assert pending_resp.json()["detail"] == "Account is pending approval."
