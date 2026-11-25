import asyncio
from unittest.mock import MagicMock, patch

from azure.core.exceptions import HttpResponseError
import pytest

from app.core.email import (
    EmailAttachment,
    EmailConfigurationError,
    EmailDeliveryError,
    EmailSendResult,
    EmailService,
    get_email_service,
    send_email,
)


def _make_mock_client(result: dict[str, object] | None = None) -> MagicMock:
    poller = MagicMock()
    poller.result.return_value = (
        {"id": "msg-123", "status": "Succeeded"} if result is None else result
    )
    client = MagicMock()
    client.begin_send.return_value = poller
    return client


def test_email_service_sends_plain_and_html_with_options() -> None:
    client = _make_mock_client()
    service = EmailService(
        connection_string="endpoint=https://example.communication.azure.com/;accesskey=secret",
        sender_email="DoNotReply@example.azurecomm.net",
        timeout_seconds=15,
        client=client,
    )

    assert service.is_configured is True

    attachment = EmailAttachment(
        name="report.txt",
        content_type="text/plain",
        content_in_base64="SGVsbG8=",
        content_id="report-cid",
    )
    result = service.send_email(
        to=["student@weston.ac.uk", "  "],
        subject="  Test Notification  ",
        plain_text="Hello student",
        html="<p>Hello student</p>",
        cc="lecturer@weston.ac.uk",
        bcc=["audit@weston.ac.uk"],
        reply_to="support@weston.ac.uk",
        attachments=[attachment],
    )

    assert result == EmailSendResult(message_id="msg-123", status="Succeeded")
    client.begin_send.assert_called_once_with(
        {
            "senderAddress": "DoNotReply@example.azurecomm.net",
            "recipients": {
                "to": [{"address": "student@weston.ac.uk"}],
                "cc": [{"address": "lecturer@weston.ac.uk"}],
                "bcc": [{"address": "audit@weston.ac.uk"}],
            },
            "content": {
                "subject": "Test Notification",
                "plainText": "Hello student",
                "html": "<p>Hello student</p>",
            },
            "replyTo": [{"address": "support@weston.ac.uk"}],
            "attachments": [
                {
                    "name": "report.txt",
                    "contentType": "text/plain",
                    "contentInBase64": "SGVsbG8=",
                    "contentId": "report-cid",
                }
            ],
        }
    )
    client.begin_send.return_value.result.assert_called_once_with(timeout=15)


def test_email_service_skips_when_disabled() -> None:
    client = _make_mock_client()
    service = EmailService(
        connection_string="endpoint=https://example.communication.azure.com/;accesskey=secret",
        sender_email="DoNotReply@example.azurecomm.net",
        enabled=False,
        client=client,
    )

    result = service.send_email(
        to="student@weston.ac.uk",
        subject="Disabled",
        plain_text="Should not send",
    )

    assert result is None
    client.begin_send.assert_not_called()


def test_email_service_without_wait_returns_accepted() -> None:
    client = _make_mock_client()
    service = EmailService(
        connection_string="endpoint=https://example.communication.azure.com/;accesskey=secret",
        sender_email="DoNotReply@example.azurecomm.net",
        client=client,
    )

    result = service.send_email(
        to="student@weston.ac.uk",
        subject="Async Queue",
        plain_text="Queued",
        wait_for_completion=False,
    )

    assert result == EmailSendResult(message_id="", status="Accepted")
    client.begin_send.return_value.result.assert_not_called()


def test_email_service_raises_on_missing_configuration() -> None:
    no_sender = EmailService(
        connection_string="endpoint=https://example.communication.azure.com/;accesskey=secret",
        sender_email=None,
    )
    assert no_sender.is_configured is False
    with pytest.raises(EmailConfigurationError, match="SENDER_EMAIL"):
        no_sender.send_email(
            to="student@weston.ac.uk",
            subject="Hi",
            plain_text="Body",
        )

    no_conn = EmailService(
        connection_string=None,
        sender_email="DoNotReply@example.azurecomm.net",
    )
    assert no_conn.is_configured is False
    with pytest.raises(EmailConfigurationError, match="CONNECTION_STRING"):
        no_conn.send_email(
            to="student@weston.ac.uk",
            subject="Hi",
            plain_text="Body",
        )


def test_email_service_lazily_creates_client_from_connection_string() -> None:
    mock_client = _make_mock_client()
    with patch(
        "app.core.email.EmailClient.from_connection_string",
        return_value=mock_client,
    ) as from_conn:
        service = EmailService(
            connection_string="endpoint=https://example.communication.azure.com/;accesskey=secret",
            sender_email="DoNotReply@example.azurecomm.net",
        )
        result = service.send_email(
            to="student@weston.ac.uk",
            subject="Lazy client",
            plain_text="Body",
        )

    from_conn.assert_called_once_with(
        "endpoint=https://example.communication.azure.com/;accesskey=secret"
    )
    assert result == EmailSendResult(message_id="msg-123", status="Succeeded")


def test_email_service_validates_recipients_and_subject() -> None:
    service = EmailService(
        connection_string="conn",
        sender_email="sender@example.com",
        client=_make_mock_client(),
    )

    with pytest.raises(ValueError, match="recipient"):
        service.send_email(to=["  "], subject="Hi", plain_text="Body")

    with pytest.raises(ValueError, match="subject"):
        service.send_email(to="a@example.com", subject="  ", plain_text="Body")


def test_email_service_wraps_azure_and_status_errors() -> None:
    failing_client = MagicMock()
    failing_client.begin_send.side_effect = HttpResponseError("Service unavailable")
    service = EmailService(
        connection_string="conn",
        sender_email="sender@example.com",
        client=failing_client,
    )

    with pytest.raises(EmailDeliveryError, match="Service unavailable"):
        service.send_email(to="a@example.com", subject="Hi", plain_text="Body")

    failed_status_client = _make_mock_client(
        result={"id": "msg-999", "status": "Failed", "error": "Invalid recipient"}
    )
    service_failed = EmailService(
        connection_string="conn",
        sender_email="sender@example.com",
        client=failed_status_client,
    )
    with pytest.raises(EmailDeliveryError, match="Invalid recipient"):
        service_failed.send_email(
            to="a@example.com",
            subject="Hi",
            plain_text="Body",
        )


def test_send_email_async_and_module_helpers() -> None:
    client = _make_mock_client()
    service = EmailService(
        connection_string="conn",
        sender_email="sender@example.com",
        client=client,
    )

    result = asyncio.run(
        service.send_email_async(
            to="student@weston.ac.uk",
            subject="Async",
            plain_text="Async body",
        )
    )
    assert result == EmailSendResult(message_id="msg-123", status="Succeeded")

    shared = get_email_service()
    with patch.object(shared, "send_email", return_value=result) as mock_send:
        helper_result = send_email(
            to="student@weston.ac.uk",
            subject="Helper",
            plain_text="Body",
        )
    assert helper_result == result
    mock_send.assert_called_once()
