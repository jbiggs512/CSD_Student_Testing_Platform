from app.core.config import settings
from app.core.email_templates import send_branded_email


def send_password_reset_email(
    *,
    to_email: str,
    first_name: str,
    username: str,
    reset_token: str,
) -> None:
    """Send a password reset link email to an active user."""
    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={reset_token}"
    expiry_minutes = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES

    send_branded_email(
        to_email=to_email,
        subject="Reset your Altius password",
        plain_text=(
            f"Hi {first_name},\n\n"
            f"We received a request to reset the password for your Altius account (username: {username}).\n"
            f"Use the link below within {expiry_minutes} minutes to choose a new password:\n"
            f"{reset_url}\n\n"
            "If you didn't request this, you can safely ignore this email.\n\n"
            "— The Altius Team"
        ),
        badge_text="Password Reset",
        badge_bg="#fce7f3",
        badge_color="#9d174d",
        heading=f"Reset your password, {first_name}",
        greeting=f"Hi {first_name},",
        body_paragraphs=[
            "We received a request to reset the password for your <strong>Altius</strong> account.",
            f"Click the button below within <strong>{expiry_minutes} minutes</strong> to choose a new password. "
            "If you didn't request this, you can safely ignore this email.",
        ],
        username=username,
        cta_label="Reset Password",
        cta_url=reset_url,
    )
