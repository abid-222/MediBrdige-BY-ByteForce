import hashlib, hmac, os, secrets, time
import jwt
from fastapi import Depends, Header
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.db import get_db
from app.core.errors import AppError


def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 120_000)
    return salt.hex() + "$" + dk.hex()


def verify_password(pw: str, stored: str) -> bool:
    try:
        salt, dk = stored.split("$")
        new = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 120_000)
        return hmac.compare_digest(new.hex(), dk)
    except Exception:
        return False


def hash_otp(email: str, code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


def new_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def otp_matches(stored_hash: str, email: str, code: str) -> bool:
    return hmac.compare_digest(stored_hash, hash_otp(email, code))


def make_token(user_id: str, token_version: int = 0, ttl: int | None = None) -> str:
    now = int(time.time())
    claims = {"sub": user_id, "iat": now, "exp": now + (ttl or settings.session_hours * 3600), "jti": secrets.token_hex(16),
              "tv": token_version, "iss": settings.jwt_issuer, "aud": settings.jwt_audience}
    return jwt.encode(claims, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer,
                      audience=settings.jwt_audience, options={"require": ["exp", "sub", "jti", "iss", "aud"]})


def get_current_user(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    from app.models import Profile, RevokedToken
    if not authorization.lower().startswith("bearer "):
        raise AppError(401, "unauthenticated", "Missing token")
    try:
        data = decode_token(authorization[7:])
    except Exception:
        raise AppError(401, "invalid_token", "Invalid or expired token")
    if db.get(RevokedToken, data["jti"]):
        raise AppError(401, "session_ended", "This session has ended. Please log in again.")
    user = db.get(Profile, data["sub"])
    if not user or user.status == "suspended" or data.get("tv", 0) != (user.token_version or 0):
        raise AppError(401, "invalid_token", "Account not available")
    user._jti, user._exp = data["jti"], data["exp"]   # lets /auth/logout revoke exactly this session
    return user


def require_role(*roles: str):
    """Role comes from the DB profile only, never from the client."""
    def dep(user=Depends(get_current_user)):
        if user.role not in roles:
            raise AppError(403, "forbidden", "Your role cannot access this resource")
        if user.status != "active" and user.role in ("doctor", "facility_admin"):
            raise AppError(403, "pending_approval", "Account pending admin approval")
        return user
    return dep
