from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.core import audit
from app.core.email import otp_email, send_email
from app.core.config import (LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILURES, OTP_MAX_ATTEMPTS, OTP_MAX_RESEND_PER_HOUR, OTP_TTL_MINUTES, settings)
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import (get_current_user, hash_password, make_token, new_otp, otp_matches, hash_otp, verify_password)
from app.models import LoginAttempt, OtpCode, PatientProfile, Profile, RevokedToken, RoleApplication, VerificationCase

router = APIRouter(prefix="/auth", tags=["auth"])
GENERIC = {"message": "If the details are valid, a verification code has been sent."}


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = ""
    # NOTE: no `role` field. Role is never accepted from the client.


class VerifyIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class EmailIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=8)


class ApplyIn(BaseModel):
    requested_role: str  # doctor | facility_admin
    details: dict = {}
    evidence_refs: list[str] = []


def _aware(dt):
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _issue_otp(db: Session, email: str, purpose: str):
    hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    sent = db.scalar(select(func.count()).select_from(OtpCode).where(
        OtpCode.email == email, OtpCode.created_at >= hour_ago))
    if sent >= OTP_MAX_RESEND_PER_HOUR:
        raise AppError(429, "rate_limited", "Too many codes requested. Try again later.")
    code = new_otp()
    db.add(OtpCode(email=email, code_hash=hash_otp(email, code), purpose=purpose,
                   expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)))
    db.commit()
    sent = False
    if settings.email_provider != "none":
        subject, body = otp_email(code, purpose)
        sent = send_email(email, subject, body)          # failure is logged, never shown (no enumeration / delivery oracle)
    # Dev convenience only: show the code on screen when no provider delivered it.
    return code if (settings.app_env == "dev" and not sent) else None


def _check_otp(db: Session, email: str, code: str, purpose: str):
    row = db.scalars(select(OtpCode).where(
        OtpCode.email == email, OtpCode.purpose == purpose, OtpCode.consumed_at.is_(None))
        .order_by(OtpCode.created_at.desc())).first()
    if not row or _aware(row.expires_at) < datetime.now(timezone.utc) or row.attempts >= OTP_MAX_ATTEMPTS:
        raise AppError(400, "invalid_code", "Invalid or expired code")
    row.attempts += 1
    if not otp_matches(row.code_hash, email, code):
        db.commit()
        raise AppError(400, "invalid_code", "Invalid or expired code")
    row.consumed_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    existing = db.scalar(select(Profile).where(Profile.email == email))
    out = dict(GENERIC)
    if existing is None:
        p = Profile(email=email, password_hash=hash_password(body.password), role="patient", status="active")
        db.add(p)
        db.flush()
        db.add(PatientProfile(user_id=p.id, full_name=body.full_name))
        db.commit()
        code = _issue_otp(db, email, "verify")
        if code:
            out["dev_otp"] = code
    return out  # identical shape whether or not the email existed (enumeration-safe)


@router.post("/verify-email")
def verify_email(body: VerifyIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    _check_otp(db, email, body.code, "verify")
    p = db.scalar(select(Profile).where(Profile.email == email))
    if not p:
        raise AppError(400, "invalid_code", "Invalid or expired code")
    p.email_verified_at = datetime.now(timezone.utc)
    db.commit()
    audit.log(db, p, "auth.email_verified")
    return {"verified": True}


@router.post("/resend-otp")
def resend(body: EmailIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    out = dict(GENERIC)
    if db.scalar(select(Profile).where(Profile.email == email)):
        code = _issue_otp(db, email, "verify")
        if code:
            out["dev_otp"] = code
    return out


def _recent_failures(db: Session, email: str) -> int:
    since = datetime.now(timezone.utc) - timedelta(minutes=LOGIN_LOCK_MINUTES)
    return db.scalar(select(func.count()).select_from(LoginAttempt).where(
        LoginAttempt.email == email, LoginAttempt.success.is_(False), LoginAttempt.at >= since)) or 0


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    email = body.email.lower()
    ip = request.client.host if request.client else None
    if _recent_failures(db, email) >= LOGIN_MAX_FAILURES:   # brute-force lockout (also applies to unknown emails: no enumeration)
        raise AppError(429, "too_many_attempts", f"Too many failed attempts. Try again in {LOGIN_LOCK_MINUTES} minutes.")
    p = db.scalar(select(Profile).where(Profile.email == email))
    if not p or not verify_password(body.password, p.password_hash):
        db.add(LoginAttempt(email=email, ip=ip, success=False)); db.commit()
        raise AppError(401, "invalid_credentials", "Invalid email or password")
    if p.email_verified_at is None:
        raise AppError(403, "email_not_verified", "Please verify your email first")
    db.add(LoginAttempt(email=email, ip=ip, success=True)); db.commit()
    audit.log(db, p, "auth.login", ip=ip)
    return {"access_token": make_token(p.id, p.token_version or 0), "token_type": "bearer",
            "role": p.role, "status": p.status, "expires_in": settings.session_hours * 3600}


@router.post("/logout")
def logout(user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    """Server-side session end: the token's jti is blacklisted until it would have expired anyway."""
    db.add(RevokedToken(jti=user._jti, expires_at=datetime.fromtimestamp(user._exp, tz=timezone.utc)))
    db.commit()
    audit.log(db, user, "auth.logout")
    return {"logged_out": True}


@router.post("/forgot-password")
def forgot(body: EmailIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    out = dict(GENERIC)
    if db.scalar(select(Profile).where(Profile.email == email)):
        code = _issue_otp(db, email, "reset")
        if code:
            out["dev_otp"] = code
    return out


@router.post("/reset-password")
def reset(body: ResetIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    _check_otp(db, email, body.code, "reset")
    p = db.scalar(select(Profile).where(Profile.email == email))
    p.password_hash = hash_password(body.new_password)
    p.token_version = (p.token_version or 0) + 1      # every existing session dies on password reset
    db.commit()
    return {"reset": True}


@router.get("/me")
def me(user: Profile = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role, "status": user.status,
            "email_verified": user.email_verified_at is not None, "facility_id": user.facility_id}


@router.post("/role-applications")
def apply(body: ApplyIn, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.requested_role not in ("doctor", "facility_admin"):
        raise AppError(400, "invalid_role", "Only doctor or facility applications are accepted")
    if user.email_verified_at is None:
        raise AppError(403, "email_not_verified", "Verify your email first")
    app_row = RoleApplication(user_id=user.id, requested_role=body.requested_role,
                              evidence_refs=body.evidence_refs, details=body.details)
    db.add(app_row)
    db.flush()
    db.add(VerificationCase(entity_type="role_application", entity_id=app_row.id, evidence=body.evidence_refs))
    db.commit()
    audit.log(db, user, "auth.role_application", resource_type="role_application", resource_id=app_row.id)
    return {"id": app_row.id, "status": "pending"}
