import logging

from app.core.config import settings
from app.core.email import EmailServiceError, email_service
from app.core.email_templates import get_branded_email_attachments, render_branded_email

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
            attachments=get_branded_email_attachments(),
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
    subject = f"Welcome to Altius, {first_name}! Your account is under review"
    plain_text = (
        f"Hi {first_name},\n\n"
        "Thanks for signing up for Altius — we're excited to have you join us!\n"
        f"Your account (username: {username}) is currently under review for approval "
        "by a lecturer or administrator.\n"
        "As soon as it's approved, we'll send you another email so you can jump straight in.\n\n"
        "See you soon,\n"
        "The Altius Team"
    )
    html = render_branded_email(
        badge_text="Pending Approval",
        badge_bg="#fef3c7",
        badge_color="#92400e",
        heading=f"Welcome aboard, {first_name}!",
        greeting=f"Hi {first_name},",
        body_paragraphs=[
            "Thanks for signing up for <strong>Altius</strong> &mdash; we're excited to have you join us!",
            "Your lecturer or administrator is taking a quick look at your registration. "
            "As soon as they approve your account, we'll send you another email so you can jump straight in.",
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
    login_url = f"{settings.FRONTEND_URL.rstrip('/')}/login"

    subject = f"You're in, {first_name}! Your Altius account is approved"
    plain_text = (
        f"Hi {first_name},\n\n"
        f"Great news — your Altius account (username: {username}) has been approved "
        "and is ready to go!\n"
        f"Sign in at {login_url} to explore your courses, practice your subjects, "
        "and start climbing the leaderboard.\n\n"
        "Good luck,\n"
        "The Altius Team"
    )
    html = render_branded_email(
        badge_text="Account Approved",
        badge_bg="#dcfce7",
        badge_color="#166534",
        heading=f"You're all set, {first_name}!",
        greeting=f"Hi {first_name},",
        body_paragraphs=[
            "Great news &mdash; your <strong>Altius</strong> account has been approved and is ready to go!",
            "Sign in with your username below to explore your courses, practice your subjects, "
            "and start climbing the leaderboard.",
        ],
        username=username,
        cta_label="Sign In & Get Started",
        cta_url=login_url,
    )

    _send_notification_email(
        to_email=to_email,
        subject=subject,
        plain_text=plain_text,
        html=html,
    )
