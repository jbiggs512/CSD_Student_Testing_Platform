from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import BackgroundTasks

from app.api.v1.user import emails, router, schemas
from app.core.email import EmailDeliveryError
from app.enums import AccountStatus


def test_send_registration_pending_email_when_configured() -> None:
    with (
        patch.object(emails.email_service, "enabled", True),
        patch.object(emails.email_service, "connection_string", "conn"),
        patch.object(emails.email_service, "sender_email", "DoNotReply@myaltius.app"),
        patch.object(emails.email_service, "send_email") as mock_send,
    ):
        emails.send_registration_pending_email(
            to_email="student@weston.ac.uk",
            first_name="Alice <script>",
            username="WS100001",
        )

    mock_send.assert_called_once()
    kwargs = mock_send.call_args.kwargs
    assert kwargs["to"] == "student@weston.ac.uk"
    assert "under review" in kwargs["subject"]
    assert "under review for approval" in kwargs["plain_text"]
    assert "WS100001" in kwargs["plain_text"]
    assert "Hi Alice &lt;script&gt;," in kwargs["html"]
    assert "#0a2262" in kwargs["html"]
    assert "Pending Approval" in kwargs["html"]
    assert "Elevate Your Learning" in kwargs["html"]
    assert "cid:altius-logo" in kwargs["html"]
    assert "cid:trivium-logo" in kwargs["html"]
    assert "Trivium&trade;" in kwargs["html"]
    attachment_cids = {att.content_id for att in kwargs["attachments"]}
    assert attachment_cids == {"altius-logo", "trivium-logo"}


def test_send_account_approved_email_when_configured() -> None:
    with (
        patch.object(emails.email_service, "enabled", True),
        patch.object(emails.email_service, "connection_string", "conn"),
        patch.object(emails.email_service, "sender_email", "DoNotReply@myaltius.app"),
        patch.object(emails.email_service, "send_email") as mock_send,
        patch.object(emails.settings, "EMAIL_LOGO_URL", "https://myaltius.app/logo.png"),
    ):
        emails.send_account_approved_email(
            to_email="student@weston.ac.uk",
            first_name="Alice",
            username="WS100001",
        )

    mock_send.assert_called_once()
    kwargs = mock_send.call_args.kwargs
    assert kwargs["to"] == "student@weston.ac.uk"
    assert "approved" in kwargs["subject"].lower()
    assert "has been approved" in kwargs["plain_text"]
    assert "WS100001" in kwargs["html"]
    assert "https://myaltius.app/logo.png" in kwargs["html"]
    assert "Sign In &amp; Get Started" in kwargs["html"]


def test_notification_email_skips_when_unconfigured_and_swallows_delivery_error() -> None:
    with (
        patch.object(emails.email_service, "connection_string", None),
        patch.object(emails.email_service, "sender_email", None),
        patch.object(emails.email_service, "send_email") as mock_send,
    ):
        emails.send_registration_pending_email(
            to_email="student@weston.ac.uk",
            first_name="Alice",
            username="WS100001",
        )
    mock_send.assert_not_called()

    with (
        patch.object(emails.email_service, "enabled", True),
        patch.object(emails.email_service, "connection_string", "conn"),
        patch.object(emails.email_service, "sender_email", "DoNotReply@myaltius.app"),
        patch.object(
            emails.email_service,
            "send_email",
            side_effect=EmailDeliveryError("Transient Azure error"),
        ),
    ):
        emails.send_account_approved_email(
            to_email="student@weston.ac.uk",
            first_name="Alice",
            username="WS100001",
        )


def test_router_schedules_pending_and_approval_emails() -> None:
    pending_user = SimpleNamespace(
        email="student@weston.ac.uk",
        first_name="Alice",
        username="WS100001",
        account_status=AccountStatus.PENDING,
    )
    approved_user = SimpleNamespace(
        email="student@weston.ac.uk",
        first_name="Alice",
        username="WS100001",
        account_status=AccountStatus.ACTIVE,
    )

    student_payload = schemas.StudentCreateRequest(
        username="WS100001",
        first_name="Alice",
        last_name="Student",
        email="student@weston.ac.uk",
        password="StrongPassword123!",
    )

    bg_register = BackgroundTasks()
    with patch("app.api.v1.user.service.create_user", return_value=pending_user):
        created = router.request_create_student(
            student=student_payload,
            background_tasks=bg_register,
            db=MagicMock(),
        )
    assert created is pending_user
    assert len(bg_register.tasks) == 1
    assert bg_register.tasks[0].func is emails.send_registration_pending_email
    assert bg_register.tasks[0].kwargs == {
        "to_email": "student@weston.ac.uk",
        "first_name": "Alice",
        "username": "WS100001",
    }

    bg_approve = BackgroundTasks()
    with patch("app.api.v1.user.service.approve_student", return_value=approved_user):
        approved = router.approve_student(
            username="WS100001",
            background_tasks=bg_approve,
            db=MagicMock(),
            current_user=MagicMock(),
        )
    assert approved is approved_user
    assert len(bg_approve.tasks) == 1
    assert bg_approve.tasks[0].func is emails.send_account_approved_email
    assert bg_approve.tasks[0].kwargs == {
        "to_email": "student@weston.ac.uk",
        "first_name": "Alice",
        "username": "WS100001",
    }
