import csv, io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core import audit
from app.core.config import STALE_AFTER_DAYS
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import require_role
from app.models import (Appointment, AuditLog, DirectoryReport, DoctorProfile, Facility, FeatureFlag, Document, ModelRegistry, Observation,
                        Profile, RoleApplication, SystemSetting, VerificationCase)
from app.modules.directory.service import is_stale

router = APIRouter(prefix="/admin", tags=["admin"])
STAFF = require_role("super_admin", "reviewer")
SUPER = require_role("super_admin")


class VerifyIn(BaseModel):
    decision: str   # approve | reject | need_more_evidence
    reason: str
    evidence: list[str] = []


def _decide(db: Session, user, entity, entity_type: str, body: VerifyIn):
    if body.decision not in ("approve", "reject", "need_more_evidence"):
        raise AppError(400, "invalid_decision", "Decision must be approve, reject or need_more_evidence")
    if not body.reason.strip():
        raise AppError(400, "reason_required", "A reason is mandatory")
    if body.decision == "approve" and not body.evidence:
        raise AppError(400, "evidence_required", "'Verified' needs attached evidence")   # G5
    before = {"verification": entity.verification}
    entity.verification = {"approve": "verified", "reject": "rejected", "need_more_evidence": "needs_evidence"}[body.decision]
    if body.decision == "approve":
        entity.last_verified_at = datetime.now(timezone.utc)
    db.add(VerificationCase(entity_type=entity_type, entity_id=getattr(entity, "user_id", None) or entity.id,
                            status=entity.verification, reviewer_id=user.id, reason=body.reason, evidence=body.evidence))
    db.commit()
    audit.log(db, user, f"admin.{entity_type}.verify", resource_type=entity_type,
              resource_id=getattr(entity, "user_id", None) or entity.id, reason=body.reason,
              before=before, after={"verification": entity.verification, "evidence": body.evidence})
    return {"verification": entity.verification}


@router.get("/verification-queue")
def queue(user: Profile = Depends(STAFF), db: Session = Depends(get_db)):
    docs = db.scalars(select(DoctorProfile).where(DoctorProfile.verification.in_(["unverified", "pending", "needs_evidence"]))).all()
    facs = db.scalars(select(Facility).where(Facility.verification.in_(["unverified", "pending", "needs_evidence"]))).all()
    apps = db.scalars(select(RoleApplication).where(RoleApplication.status == "pending")).all()
    return {"doctors": [{"id": d.user_id, "name": d.full_name, "verification": d.verification, "is_sample": d.is_sample} for d in docs],
            "facilities": [{"id": f.id, "name": f.name, "verification": f.verification, "is_sample": f.is_sample} for f in facs],
            "applications": [{"id": a.id, "user_id": a.user_id, "requested_role": a.requested_role, "details": a.details,
                              "evidence_refs": a.evidence_refs} for a in apps]}


@router.patch("/doctors/{doctor_id}/verify")
def verify_doctor(doctor_id: str, body: VerifyIn, user: Profile = Depends(STAFF), db: Session = Depends(get_db)):
    d = db.get(DoctorProfile, doctor_id)
    if not d:
        raise AppError(404, "not_found", "Doctor not found")
    return _decide(db, user, d, "doctor", body)


@router.patch("/facilities/{facility_id}/verify")
def verify_facility(facility_id: str, body: VerifyIn, user: Profile = Depends(STAFF), db: Session = Depends(get_db)):
    f = db.get(Facility, facility_id)
    if not f:
        raise AppError(404, "not_found", "Facility not found")
    return _decide(db, user, f, "facility", body)


class AppDecision(BaseModel):
    decision: str
    reason: str
    evidence: list[str] = []


@router.patch("/role-applications/{app_id}")
def decide_application(app_id: str, body: AppDecision, user: Profile = Depends(STAFF), db: Session = Depends(get_db)):
    a = db.get(RoleApplication, app_id)
    if not a:
        raise AppError(404, "not_found", "Application not found")
    if not body.reason.strip():
        raise AppError(400, "reason_required", "A reason is mandatory")
    if body.decision == "approve":
        if not body.evidence and not a.evidence_refs:
            raise AppError(400, "evidence_required", "Approval needs attached evidence")
        u = db.get(Profile, a.user_id)
        u.role, u.status = a.requested_role, "active"
        if a.requested_role == "doctor" and not db.get(DoctorProfile, u.id):
            db.add(DoctorProfile(user_id=u.id, full_name=a.details.get("full_name", u.email), verification="pending"))
        if a.requested_role == "facility_admin":
            f = Facility(name=a.details.get("facility_name", "New facility"), verification="pending")
            db.add(f)
            db.flush()
            u.facility_id = f.id
        a.status = "approved"
    elif body.decision == "reject":
        a.status = "rejected"
    else:
        a.status = "needs_evidence"
    a.reviewer_id = user.id
    db.commit()
    audit.log(db, user, "admin.role_application.decide", resource_type="role_application", resource_id=a.id,
              reason=body.reason, after={"status": a.status})
    return {"status": a.status}


def _filtered_logs(db, actor_id, action, result, patient_id):
    q = select(AuditLog).order_by(AuditLog.id.desc())
    if actor_id: q = q.where(AuditLog.actor_id == actor_id)
    if action: q = q.where(AuditLog.action.like(f"{action}%"))
    if result: q = q.where(AuditLog.result == result)
    if patient_id: q = q.where(AuditLog.patient_id == patient_id)
    return q


@router.get("/audit-logs")
def audit_logs(user: Profile = Depends(SUPER), db: Session = Depends(get_db), actor_id: str | None = None,
               action: str | None = None, result: str | None = None, patient_id: str | None = None,
               page: int = 1, page_size: int = 50):
    page_size = min(page_size, 50)
    rows = db.scalars(_filtered_logs(db, actor_id, action, result, patient_id).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": [{"id": r.id, "actor_id": r.actor_id, "actor_role": r.actor_role, "action": r.action,
                       "resource_type": r.resource_type, "resource_id": r.resource_id, "result": r.result,
                       "reason": r.reason, "before": r.before, "after": r.after, "at": r.created_at} for r in rows]}


@router.get("/audit-logs/export")
def export_logs(user: Profile = Depends(SUPER), db: Session = Depends(get_db), actor_id: str | None = None,
                action: str | None = None, result: str | None = None, patient_id: str | None = None):
    rows = db.scalars(_filtered_logs(db, actor_id, action, result, patient_id).limit(10000)).all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "at", "actor_id", "actor_role", "action", "resource_type", "resource_id", "result", "reason"])
    for r in rows:
        w.writerow([r.id, r.created_at, r.actor_id, r.actor_role, r.action, r.resource_type, r.resource_id, r.result, r.reason])
    audit.log(db, user, "admin.audit_export", reason=f"{len(rows)} rows")
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=audit_logs.csv"})


@router.get("/overview")
def overview(user: Profile = Depends(STAFF), db: Session = Depends(get_db)):
    c = lambda m: db.scalar(select(func.count()).select_from(m))
    return {"users": c(Profile), "doctors": c(DoctorProfile), "facilities": c(Facility), "documents": c(Document),
            "observations": c(Observation), "appointments": c(Appointment), "open_reports": db.scalar(select(func.count()).select_from(DirectoryReport).where(DirectoryReport.status == "open"))}


@router.get("/users")
def users(user: Profile = Depends(SUPER), db: Session = Depends(get_db)):
    return {"items": [{"id": u.id, "email": u.email, "role": u.role, "status": u.status} for u in db.scalars(select(Profile).limit(200)).all()]}


class UserStatusIn(BaseModel):
    status: str   # active | suspended
    reason: str


@router.patch("/users/{user_id}/status")
def set_user_status(user_id: str, body: UserStatusIn, user: Profile = Depends(SUPER), db: Session = Depends(get_db)):
    if body.status not in ("active", "suspended") or not body.reason.strip():
        raise AppError(400, "invalid_request", "Status must be active or suspended, and a reason is required")
    target = db.get(Profile, user_id)
    if not target:
        raise AppError(404, "not_found", "User not found")
    if target.id == user.id:
        raise AppError(400, "self_action", "You cannot change your own status")
    before = {"status": target.status}
    target.status = body.status
    if body.status == "suspended":
        target.token_version = (target.token_version or 0) + 1   # kicks the user out immediately
    db.commit()
    audit.log(db, user, "admin.user.status", resource_type="user", resource_id=target.id, reason=body.reason,
              before=before, after={"status": target.status})
    return {"id": target.id, "status": target.status}


@router.get("/system")
def system(user: Profile = Depends(STAFF), db: Session = Depends(get_db)):
    from sqlalchemy import text
    from app.core.config import settings
    try:
        db.execute(text("select 1")); dbok = True
    except Exception:
        dbok = False
    return {"database": "ok" if dbok else "down", "env": settings.app_env, "ai_provider": "claude" if settings.anthropic_api_key else "fallback"}


@router.get("/directory-quality")
def directory_quality(user: Profile = Depends(STAFF), db: Session = Depends(get_db)):
    docs = db.scalars(select(DoctorProfile)).all()
    names: dict[str, int] = {}
    for d in docs:
        names[d.full_name.lower()] = names.get(d.full_name.lower(), 0) + 1
    return {"stale_after_days": STALE_AFTER_DAYS,
            "stale_doctors": [d.user_id for d in docs if is_stale(d.last_verified_at)],
            "stale_facilities": [f.id for f in db.scalars(select(Facility)).all() if is_stale(f.last_verified_at)],
            "possible_duplicates": [n for n, k in names.items() if k > 1],
            "open_reports": db.scalars(select(DirectoryReport).where(DirectoryReport.status == "open")).all().__len__()}


@router.get("/ocr-review")
def ocr_review(user: Profile = Depends(STAFF), db: Session = Depends(get_db)):
    rows = db.scalars(select(Observation).where(Observation.low_confidence.is_(True)).limit(100)).all()
    return {"items": [{"id": o.id, "test_code": o.test_code, "value": o.value_raw, "unit": o.unit, "confidence": o.confidence} for o in rows]}


@router.get("/models")
def models(user: Profile = Depends(SUPER), db: Session = Depends(get_db)):
    rows = db.scalars(select(ModelRegistry)).all()
    return {"items": [{"id": m.id, "model_name": m.model_name, "version": m.version, "dataset_version": m.dataset_version,
                       "metrics": m.metrics, "intended_use": m.intended_use, "limitations": m.limitations,
                       "approval_status": m.approval_status} for m in rows]}


class SettingsIn(BaseModel):
    settings: dict = {}
    flags: dict[str, bool] = {}
    reason: str


@router.get("/settings")
def get_settings(user: Profile = Depends(SUPER), db: Session = Depends(get_db)):
    return {"settings": {s.key: s.value for s in db.scalars(select(SystemSetting)).all()},
            "flags": {f.flag: f.enabled for f in db.scalars(select(FeatureFlag)).all()}}


@router.put("/settings")
def put_settings(body: SettingsIn, user: Profile = Depends(SUPER), db: Session = Depends(get_db)):
    if not body.reason.strip():
        raise AppError(400, "reason_required", "A reason is mandatory")
    before = get_settings(user, db)
    for k, v in body.settings.items():
        row = db.get(SystemSetting, k) or SystemSetting(key=k)
        row.value, row.updated_by = v if isinstance(v, dict) else {"value": v}, user.id
        db.add(row)
    for k, v in body.flags.items():
        row = db.get(FeatureFlag, k) or FeatureFlag(flag=k)
        row.enabled = v
        db.add(row)
    db.commit()
    audit.log(db, user, "admin.settings.update", reason=body.reason, before=before, after=body.model_dump())
    return get_settings(user, db)
# NOTE: there is intentionally NO admin endpoint that edits or deletes signed clinical notes.
