from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import BackgroundTasks, HTTPException
import pytest

from app.api.v1.auth import emails, router, schemas, service
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    hash_password,
    verify_password,
)
from app.enums import AccountStatus


def test_request_password_reset_returns_token_only_for_active_user() -> None:
    active_user = SimpleNamespace(
        username="WS100001",
        email="alice@weston.ac.uk",
        first_name="Alice",
        password_hash=hash_password("OldPassword123!"),
        account_status=AccountStatus.ACTIVE,
    )
    pending_user = SimpleNamespace(
        username="WS100002",
        email="bob@weston.ac.uk",
        first_name="Bob",
        password_hash=hash_password("OldPassword123!"),
        account_status=AccountStatus.PENDING,
    )

    db = MagicMock()
    db.scalar.return_value = active_user
    res = service.request_password_reset(db, "ALICE@weston.ac.uk")
    assert res is not None
    assert res[0] is active_user
    assert isinstance(res[1], str)

    db.scalar.return_value = pending_user
    assert service.request_password_reset(db, "bob@weston.ac.uk") is None

    db.scalar.return_value = None
    assert service.request_password_reset(db, "missing@weston.ac.uk") is None


def test_reset_password_updates_password_and_invalidates_reused_token() -> None:
    old_hash = hash_password("OldPassword123!")
    user = SimpleNamespace(
        username="WS100001",
        password_hash=old_hash,
        account_status=AccountStatus.ACTIVE,
        failed_login_attempts=4,
        locked_until=datetime.now(timezone.utc),
    )
    token = create_password_reset_token(user.username, user.password_hash)

    db = MagicMock()
    db.scalar.return_value = user

    service.reset_password(db, token, "NewPassword456!")

    assert verify_password("NewPassword456!", user.password_hash) is True
    assert user.failed_login_attempts == 0
    assert user.locked_until is None
    db.commit.assert_called_once()

    # Reusing the same token after password change must fail
    with pytest.raises(HTTPException) as exc_info:
        service.reset_password(db, token, "AnotherPassword789!")
    assert exc_info.value.status_code == 400


def test_reset_password_rejects_expired_wrong_type_or_inactive_user() -> None:
    old_hash = hash_password("OldPassword123!")
    user = SimpleNamespace(
        username="WS100001",
        password_hash=old_hash,
        account_status=AccountStatus.ACTIVE,
        failed_login_attempts=0,
        locked_until=None,
    )
    db = MagicMock()
    db.scalar.return_value = user

    expired_token = create_password_reset_token(
        user.username, old_hash, expires_delta=timedelta(minutes=-1)
    )
    with pytest.raises(HTTPException) as exc_expired:
        service.reset_password(db, expired_token, "NewPassword456!")
    assert exc_expired.value.status_code == 400

    access_token = create_access_token(user.username)
    with pytest.raises(HTTPException) as exc_wrong_type:
        service.reset_password(db, access_token, "NewPassword456!")
    assert exc_wrong_type.value.status_code == 400

    valid_token = create_password_reset_token(user.username, old_hash)
    user.account_status = AccountStatus.DISABLED
    with pytest.raises(HTTPException) as exc_disabled:
        service.reset_password(db, valid_token, "NewPassword456!")
    assert exc_disabled.value.status_code == 400


def test_forgot_and_reset_password_router_and_email() -> None:
    active_user = SimpleNamespace(
        email="alice@weston.ac.uk",
        first_name="Alice",
        username="WS100001",
    )

    bg = BackgroundTasks()
    with patch(
        "app.api.v1.auth.service.request_password_reset",
        return_value=(active_user, "reset-jwt-token"),
    ):
        resp = router.forgot_password(
            payload=schemas.ForgotPasswordRequest(email="alice@weston.ac.uk"),
            background_tasks=bg,
            db=MagicMock(),
        )
    assert "reset link has been sent" in resp.message
    assert len(bg.tasks) == 1
    assert bg.tasks[0].func is emails.send_password_reset_email

    with patch("app.api.v1.auth.emails.send_branded_email") as mock_send:
        emails.send_password_reset_email(
            to_email="alice@weston.ac.uk",
            first_name="Alice",
            username="WS100001",
            reset_token="reset-jwt-token",
        )
    mock_send.assert_called_once()
    kwargs = mock_send.call_args.kwargs
    assert kwargs["to_email"] == "alice@weston.ac.uk"
    assert "/reset-password?token=reset-jwt-token" in kwargs["cta_url"]
    assert "/reset-password?token=reset-jwt-token" in kwargs["plain_text"]

    with patch("app.api.v1.auth.service.reset_password") as mock_reset:
        reset_resp = router.reset_password(
            payload=schemas.ResetPasswordRequest(
                token="reset-jwt-token",
                new_password="NewPassword456!",
            ),
            db=MagicMock(),
        )
    assert reset_resp.message == "Password has been reset successfully."
    mock_reset.assert_called_once()
