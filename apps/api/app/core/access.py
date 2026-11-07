"""M2 — require_access: role + ownership + active care relationship + unexpired consent + resource scope."""
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core import audit
from app.core.errors import AppError
from app.models import BreakGlassEvent, CareRelationship, Consent, PatientProfile

CLINICAL = {"documents", "observations", "notes", "profile"}
ALL_RESOURCES = CLINICAL | {"preferences"}


def _aware(dt):
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _now():
    return datetime.now(timezone.utc)


def active_consents(db: Session, patient_id: str, doctor_id: str, ctype="doctor_share"):
    rows = db.scalars(select(Consent).where(
        Consent.patient_id == patient_id, Consent.consent_type == ctype, Consent.revoked_at.is_(None))).all()
    out = []
    for c in rows:
        if c.expires_at and _aware(c.expires_at) <= _now():
            continue
        if c.grantee_id and c.grantee_id != doctor_id:
            continue
        out.append(c)
    return out


def decide(db: Session, actor, patient_id: str, resource: str, resource_id: str | None = None):
    """Returns (allowed, reason). Pure decision, no side effects."""
    if resource not in ALL_RESOURCES:
        return False, "unknown_resource"
    if actor.role == "patient":
        return (actor.id == patient_id), ("owner" if actor.id == patient_id else "not_owner")
    if actor.role == "doctor":
        if actor.status != "active":
            return False, "doctor_not_active"
        rel = db.scalar(select(CareRelationship).where(
            CareRelationship.patient_id == patient_id, CareRelationship.doctor_id == actor.id,
            CareRelationship.active.is_(True)))
        if not rel:
            return False, "no_care_relationship"
        ctype = "affordability_share" if resource == "preferences" else "doctor_share"
        for c in active_consents(db, patient_id, actor.id, ctype):
            res = (c.scope or {}).get("resources")
            docs = (c.scope or {}).get("document_ids")
            if res is not None and resource not in res:
                continue
            if docs and resource == "documents" and resource_id and resource_id not in docs:
                continue
            return True, "consent"
        return False, "no_active_consent"
    if actor.role in ("super_admin", "reviewer"):
        bg = db.scalars(select(BreakGlassEvent).where(
            BreakGlassEvent.admin_id == actor.id, BreakGlassEvent.patient_id == patient_id)).all()
        if actor.role == "super_admin" and any(_aware(b.expires_at) > _now() for b in bg):
            return True, "break_glass"
        return False, "admin_requires_break_glass"
    return False, "role_not_permitted"


def require_access(db: Session, actor, patient_id: str, resource: str, action: str = "read", resource_id=None):
    if not db.get(PatientProfile, patient_id):
        raise AppError(404, "not_found", "Patient not found")
    ok, why = decide(db, actor, patient_id, resource, resource_id)
    audit.log(db, actor, f"{resource}.{action}", resource_type=resource, resource_id=resource_id,
              patient_id=patient_id, result="allow" if ok else "deny", reason=why)
    if not ok:
        raise AppError(403, "access_denied", "You do not have access to this record", {"reason": why})
    return True
