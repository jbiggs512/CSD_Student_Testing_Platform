from html import escape
import logging

from app.core.config import settings
from app.core.email import EmailServiceError, email_service
from app.core.email_templates import render_branded_email

logger = logging.getLogger(__name__)


def _send_notification_email(
    *,
    to_email: str,
    subject: str,
    plain_text: str,
    html: str,
) -> None:
    """Send a user lifecycle notification email without failing caller workflows."""
    if not email_service.enabled or not email_service.is_configured:
        logger.info(
            "Skipping email '%s' to %s because email service is disabled or unconfigured.",
            subject,
            to_email,
        )
        return

    try:
        email_service.send_email(
            to=to_email,
            subject=subject,
            plain_text=plain_text,
            html=html,
        )
    except EmailServiceError:
        logger.exception("Failed to send email '%s' to %s.", subject, to_email)


def send_registration_pending_email(
    *,
    to_email: str,
    first_name: str,
    username: str,
) -> None:
    """Notify a newly registered student that their account is awaiting approval."""
    project_name = settings.PROJECT_NAME
    safe_project = escape(project_name)

    subject = f"{project_name} — Registration Received (Pending Approval)"
    plain_text = (
        f"Hi {first_name},\n\n"
        f"Thank you for registering for {project_name} (username: {username}).\n"
        "Your account is currently under review for approval by a lecturer or administrator.\n"
        "You will receive another email as soon as your account has been approved.\n\n"
        f"— {project_name}"
    )
    html = render_branded_email(
        badge_text="Pending Approval",
        badge_bg="#fef3c7",
        badge_color="#92400e",
        heading="Your account is under review",
        greeting=f"Hi {first_name},",
        body_paragraphs=[
            f"Thank you for registering for <strong>{safe_project}</strong>.",
            "Your account is currently under review for approval by a lecturer or administrator. "
            "You will receive another email as soon as your account is activated.",
        ],
        username=username,
    )

    _send_notification_email(
        to_email=to_email,
        subject=subject,
        plain_text=plain_text,
        html=html,
    )


def send_account_approved_email(
    *,
    to_email: str,
    first_name: str,
    username: str,
) -> None:
    """Notify a student that their account has been approved and is now active."""
    project_name = settings.PROJECT_NAME
    safe_project = escape(project_name)
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"

    subject = f"{project_name} — Account Approved"
    plain_text = (
        f"Hi {first_name},\n\n"
        f"Good news! Your {project_name} account (username: {username}) has been approved "
        "and is now active.\n"
        f"You can now sign in at {login_url} and start taking tests.\n\n"
        f"— {project_name}"
    )
    html = render_branded_email(
        badge_text="Account Approved",
        badge_bg="#dcfce7",
        badge_color="#166534",
        heading="You're ready to start!",
        greeting=f"Hi {first_name},",
        body_paragraphs=[
            f"Good news! Your <strong>{safe_project}</strong> account has been approved and is now active.",
            "You can now sign in using your username and password to view your courses and start taking tests.",
        ],
        username=username,
        cta_label="Sign In to Altius",
        cta_url=login_url,
    )

    _send_notification_email(
        to_email=to_email,
        subject=subject,
        plain_text=plain_text,
        html=html,
    )
