from app.core.email import (
    EmailAttachment,
    EmailConfigurationError,
    EmailDeliveryError,
    EmailSendResult,
    EmailService,
    EmailServiceError,
    email_service,
    get_email_service,
    send_email,
)

__all__ = [
    "EmailAttachment",
    "EmailConfigurationError",
    "EmailDeliveryError",
    "EmailSendResult",
    "EmailService",
    "EmailServiceError",
    "email_service",
    "get_email_service",
    "send_email",
]
