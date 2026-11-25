from collections.abc import Sequence
from dataclasses import dataclass
import logging
from typing import Any

import anyio
from azure.communication.email import EmailClient
from azure.core.exceptions import AzureError

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailServiceError(Exception):
    """Base exception for email sending failures."""


class EmailConfigurationError(EmailServiceError):
    """Raised when Azure Communication Services email settings are missing."""


class EmailDeliveryError(EmailServiceError):
    """Raised when Azure Communication Services fails to send an email."""


@dataclass(frozen=True, slots=True)
class EmailAttachment:
    """Attachment payload for an outbound email."""

    name: str
    content_type: str
    content_in_base64: str
    content_id: str | None = None

    def to_acs_dict(self) -> dict[str, str]:
        payload: dict[str, str] = {
            "name": self.name,
            "contentType": self.content_type,
            "contentInBase64": self.content_in_base64,
        }
        if self.content_id:
            payload["contentId"] = self.content_id
        return payload


@dataclass(frozen=True, slots=True)
class EmailSendResult:
    """Result returned after dispatching an email via Azure Communication Services."""

    message_id: str
    status: str


def _normalize_addresses(addresses: str | Sequence[str] | None) -> list[dict[str, str]]:
    if addresses is None:
        return []
    raw_list = [addresses] if isinstance(addresses, str) else list(addresses)
    normalized: list[dict[str, str]] = []
    for addr in raw_list:
        cleaned = addr.strip()
        if cleaned:
            normalized.append({"address": cleaned})
    return normalized


class EmailService:
    """Shared service for sending automated emails via Azure Communication Services."""

    def __init__(
        self,
        *,
        connection_string: str | None = None,
        sender_email: str | None = None,
        enabled: bool = True,
        timeout_seconds: int = 30,
        client: EmailClient | None = None,
    ) -> None:
        self.connection_string = (
            connection_string.strip() if connection_string else None
        )
        self.sender_email = sender_email.strip() if sender_email else None
        self.enabled = enabled
        self.timeout_seconds = timeout_seconds
        self._client = client

    @property
    def is_configured(self) -> bool:
        return bool(self.connection_string and self.sender_email)

    def _get_client(self) -> EmailClient:
        if not self.sender_email:
            raise EmailConfigurationError(
                "AZURE_COMMUNICATION_SENDER_EMAIL is not configured."
            )
        if self._client is not None:
            return self._client
        if not self.connection_string:
            raise EmailConfigurationError(
                "AZURE_COMMUNICATION_CONNECTION_STRING is not configured."
            )
        self._client = EmailClient.from_connection_string(self.connection_string)
        return self._client

    def send_email(
        self,
        *,
        to: str | Sequence[str],
        subject: str,
        plain_text: str,
        html: str | None = None,
        cc: str | Sequence[str] | None = None,
        bcc: str | Sequence[str] | None = None,
        reply_to: str | Sequence[str] | None = None,
        attachments: Sequence[EmailAttachment] | None = None,
        wait_for_completion: bool = True,
    ) -> EmailSendResult | None:
        """Send an email using Azure Communication Services.

        Returns ``None`` when ``enabled`` is ``False``.
        """
        to_recipients = _normalize_addresses(to)
        if not to_recipients:
            raise ValueError("At least one recipient email address is required.")

        cleaned_subject = subject.strip()
        if not cleaned_subject:
            raise ValueError("Email subject is required.")

        if not self.enabled:
            logger.info(
                "Email sending is disabled; skipping email '%s' to %d recipient(s).",
                cleaned_subject,
                len(to_recipients),
            )
            return None

        client = self._get_client()

        recipients: dict[str, list[dict[str, str]]] = {"to": to_recipients}
        cc_recipients = _normalize_addresses(cc)
        if cc_recipients:
            recipients["cc"] = cc_recipients
        bcc_recipients = _normalize_addresses(bcc)
        if bcc_recipients:
            recipients["bcc"] = bcc_recipients

        content: dict[str, str] = {
            "subject": cleaned_subject,
            "plainText": plain_text,
        }
        if html is not None:
            content["html"] = html

        message: dict[str, Any] = {
            "senderAddress": self.sender_email,
            "recipients": recipients,
            "content": content,
        }

        reply_to_addresses = _normalize_addresses(reply_to)
        if reply_to_addresses:
            message["replyTo"] = reply_to_addresses

        if attachments:
            message["attachments"] = [att.to_acs_dict() for att in attachments]

        try:
            poller = client.begin_send(message)
            if not wait_for_completion:
                return EmailSendResult(message_id="", status="Accepted")
            result = poller.result(timeout=self.timeout_seconds)
        except AzureError as exc:
            logger.exception("Azure Communication Services failed to send email.")
            raise EmailDeliveryError(
                f"Failed to send email via Azure Communication Services: {exc}"
            ) from exc

        status = str(result.get("status", ""))
        message_id = str(result.get("id", ""))
        if status.lower() != "succeeded":
            error_detail = result.get("error") or status or "Unknown error"
            raise EmailDeliveryError(
                f"Email delivery did not succeed (status={status!r}): {error_detail}"
            )

        return EmailSendResult(message_id=message_id, status=status)

    async def send_email_async(
        self,
        *,
        to: str | Sequence[str],
        subject: str,
        plain_text: str,
        html: str | None = None,
        cc: str | Sequence[str] | None = None,
        bcc: str | Sequence[str] | None = None,
        reply_to: str | Sequence[str] | None = None,
        attachments: Sequence[EmailAttachment] | None = None,
        wait_for_completion: bool = True,
    ) -> EmailSendResult | None:
        """Async wrapper around ``send_email`` for non-blocking FastAPI routes."""
        return await anyio.to_thread.run_sync(
            lambda: self.send_email(
                to=to,
                subject=subject,
                plain_text=plain_text,
                html=html,
                cc=cc,
                bcc=bcc,
                reply_to=reply_to,
                attachments=attachments,
                wait_for_completion=wait_for_completion,
            )
        )


email_service = EmailService(
    connection_string=settings.AZURE_COMMUNICATION_CONNECTION_STRING,
    sender_email=settings.AZURE_COMMUNICATION_SENDER_EMAIL,
    enabled=settings.EMAIL_ENABLED,
    timeout_seconds=settings.EMAIL_TIMEOUT_SECONDS,
)


def get_email_service() -> EmailService:
    """FastAPI dependency returning the shared EmailService instance."""
    return email_service


def send_email(
    *,
    to: str | Sequence[str],
    subject: str,
    plain_text: str,
    html: str | None = None,
    cc: str | Sequence[str] | None = None,
    bcc: str | Sequence[str] | None = None,
    reply_to: str | Sequence[str] | None = None,
    attachments: Sequence[EmailAttachment] | None = None,
    wait_for_completion: bool = True,
) -> EmailSendResult | None:
    """Convenience helper that sends an email using the shared ``email_service``."""
    return email_service.send_email(
        to=to,
        subject=subject,
        plain_text=plain_text,
        html=html,
        cc=cc,
        bcc=bcc,
        reply_to=reply_to,
        attachments=attachments,
        wait_for_completion=wait_for_completion,
    )
