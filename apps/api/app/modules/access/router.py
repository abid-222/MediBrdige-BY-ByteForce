from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core import audit
from app.core.access import ALL_RESOURCES
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import require_role
from app.models import AuditLog, BreakGlassEvent, Consent, PatientProfile, Profile

router = APIRouter(tags=["access"])
TYPES = {"privacy", "data_use", "doctor_share", "affordability_share", "research"}


class ConsentIn(BaseModel):
    consent_type: str
    grantee_id: str | None = None
    scope: dict = {}
    expires_in_days: int | None = None
    version: str = "v1"


def _out(c: Consent):
    return {"id": c.id, "consent_type": c.consent_type, "grantee_id": c.grantee_id, "scope": c.scope,
            "granted_at": c.granted_at, "expires_at": c.expires_at, "revoked_at": c.revoked_at}


@router.post("/consents")
def create_consent(body: ConsentIn, user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    if body.consent_type not in TYPES:
        raise AppError(400, "invalid_consent_type", "Unknown consent type")
    res = body.scope.get("resources")
    if res is not None and not set(res) <= ALL_RESOURCES:
        raise AppError(400, "invalid_scope", "Unknown resource in scope")
    if body.consent_type == "doctor_share" and not body.grantee_id:
        raise AppError(400, "grantee_required", "Choose a doctor to share with")
    if body.grantee_id and not db.get(Profile, body.grantee_id):
        raise AppError(404, "not_found", "Doctor not found")
    c = Consent(patient_id=user.id, consent_type=body.consent_type, grantee_id=body.grantee_id,
                scope=body.scope, version=body.version,
                expires_at=(datetime.now(timezone.utc) + timedelta(days=body.expires_in_days))
                if body.expires_in_days else None)
    db.add(c)
    db.commit()
    audit.log(db, user, "consent.grant", resource_type="consent", resource_id=c.id, patient_id=user.id,
              after={"type": c.consent_type, "grantee": c.grantee_id})
    return _out(c)


@router.get("/consents")
def list_consents(user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Consent).where(Consent.patient_id == user.id).order_by(Consent.granted_at.desc())).all()
    return {"items": [_out(c) for c in rows]}


@router.post("/consents/{consent_id}/revoke")
def revoke(consent_id: str, user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    c = db.get(Consent, consent_id)
    if not c or c.patient_id != user.id:
        raise AppError(404, "not_found", "Consent not found")
    if c.revoked_at is None:
        c.revoked_at = datetime.now(timezone.utc)
        db.commit()
    audit.log(db, user, "consent.revoke", resource_type="consent", resource_id=c.id, patient_id=user.id)
    return _out(c)


@router.get("/patients/me/access-log")
def access_log(user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db),
               page: int = 1, page_size: int = 20):
    page_size = min(page_size, 50)
    rows = db.scalars(select(AuditLog).where(AuditLog.patient_id == user.id, AuditLog.actor_id != user.id)
                      .order_by(AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [{"id": r.id, "actor_role": r.actor_role, "action": r.action, "result": r.result,
                       "reason": r.reason, "at": r.created_at} for r in rows]}


class BreakGlassIn(BaseModel):
    patient_id: str
    reason: str
    minutes: int = 30


@router.post("/admin/break-glass")
def break_glass(body: BreakGlassIn, user: Profile = Depends(require_role("super_admin")), db: Session = Depends(get_db)):
    if len(body.reason.strip()) < 10:
        raise AppError(400, "reason_required", "A detailed reason is mandatory for break-glass access")
    if not db.get(PatientProfile, body.patient_id):
        raise AppError(404, "not_found", "Patient not found")
    now = datetime.now(timezone.utc)
    ev = BreakGlassEvent(admin_id=user.id, patient_id=body.patient_id, reason=body.reason,
                         expires_at=now + timedelta(minutes=min(body.minutes, 60)), alerted_at=now)
    db.add(ev)
    db.commit()
    audit.log(db, user, "admin.break_glass", resource_type="patient", resource_id=body.patient_id,
              patient_id=body.patient_id, reason=body.reason)
    from app.models import Notification
    db.add(Notification(user_id=body.patient_id, template="break_glass_alert", payload={"at": now.isoformat()}))
    db.commit()
    return {"id": ev.id, "expires_at": ev.expires_at, "alerted": True}
