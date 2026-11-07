"""Transactional email (OTP). Providers: resend | smtp | none. The message body (which contains the OTP) is NEVER logged."""
import logging, smtplib
from email.message import EmailMessage
import httpx
from app.core.config import settings

log = logging.getLogger("medibridge")
_http = httpx.post   # tests replace this


def send_email(to: str, subject: str, text: str) -> bool:
    """Returns True if a provider accepted the message. Never raises: callers must not leak delivery failures to the user."""
    try:
        if settings.email_provider == "resend":
            r = _http("https://api.resend.com/emails", timeout=15,
                      headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                      json={"from": settings.email_from, "to": [to], "subject": subject, "text": text})
            if r.status_code >= 300:
                log.error("resend rejected email: status=%s", r.status_code)     # status only; body may echo the address
                return False
            return True
        if settings.email_provider == "smtp":
            msg = EmailMessage()
            msg["From"], msg["To"], msg["Subject"] = settings.email_from, to, subject
            msg.set_content(text)
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_password)
                s.send_message(msg)
            return True
    except Exception:
        log.exception("email delivery failed")
        return False
    return False


def otp_email(code: str, purpose: str):
    if purpose == "reset":
        return "MediBridge password reset code", f"Your MediBridge password reset code is {code}. It expires in 10 minutes. If you did not request this, ignore this email."
    return "Verify your MediBridge email", f"Your MediBridge verification code is {code}. It expires in 10 minutes. If you did not create an account, ignore this email."
