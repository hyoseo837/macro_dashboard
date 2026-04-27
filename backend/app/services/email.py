import logging
from email.message import EmailMessage

import aiosmtplib

from ..config import settings

logger = logging.getLogger(__name__)


async def send_reset_email(to_email: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured — printing reset link to console")
        logger.info("Password reset link for %s: %s", to_email, reset_url)
        return

    msg = EmailMessage()
    msg["Subject"] = "Macro Dashboard — Password Reset"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        f"You requested a password reset.\n\n"
        f"Click the link below to reset your password (expires in {settings.RESET_TOKEN_EXPIRE_MINUTES} minutes):\n\n"
        f"{reset_url}\n\n"
        f"If you did not request this, ignore this email."
    )

    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        start_tls=True,
    )
    logger.info("Password reset email sent to %s", to_email)
