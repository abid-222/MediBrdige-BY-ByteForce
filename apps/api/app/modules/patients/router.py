from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core import audit
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import get_current_user, require_role
from app.models import (Appointment, Consent, Document, MedicationAllergy, Notification, Observation,
                        PatientCondition, PatientPreference, PatientProfile, Profile)

router = APIRouter(tags=["patients"])
BUDGETS = {"low", "medium", "high", "flexible"}
CARE = {"government", "private", "charitable", "teaching", "clinic", "any"}


class ProfileIn(BaseModel):
    full_name: str | None = None
    dob: str | None = None
    sex: str | None = None
    language: str | None = None
    phone: str | None = None
    division: str | None = None
    district: str | None = None
    upazila: str | None = None
    emergency_name: str | None = None
    emergency_phone: str | None = None
    emergency_relation: str | None = None
    accessibility_needs: str | None = None
    onboarding_step: int | None = None
    onboarding_completed: bool | None = None
    conditions: list[str] | None = None
    allergies: list[str] | None = None
    medications: list[str] | None = None
    # Deliberately absent: NID/passport, exact income, religion, full address (blueprint M3 rules).


class PrefIn(BaseModel):
    budget: str | None = None
    care_pref: list[str] | None = None
    travel_limit_km: int | None = None
    transport_difficulty: bool | None = None
    assistance_need: bool | None = None
    visible_to_doctor: bool | None = None


def _profile_out(db: Session, p: PatientProfile):
    conds = db.scalars(select(PatientCondition.condition_text).where(PatientCondition.patient_id == p.user_id)).all()
    items = db.scalars(select(MedicationAllergy).where(MedicationAllergy.patient_id == p.user_id)).all()
    return {**{c: getattr(p, c) for c in ("user_id", "full_name", "dob", "sex", "language", "phone", "division",
             "district", "upazila", "emergency_name", "emergency_phone", "emergency_relation",
             "accessibility_needs", "onboarding_step", "onboarding_completed")},
            "conditions": list(conds),
            "allergies": [i.item for i in items if i.kind == "allergy"],
            "medications": [i.item for i in items if i.kind == "medication"]}


@router.get("/patients/me")
def get_me(user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    return _profile_out(db, db.get(PatientProfile, user.id))


@router.put("/patients/me")
def put_me(body: ProfileIn, user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    p = db.get(PatientProfile, user.id)
    data = body.model_dump(exclude_unset=True)
    if "language" in data and data["language"] not in ("en", "bn"):
        raise AppError(400, "invalid_language", "Language must be en or bn")
    for k in ("conditions", "allergies", "medications"):
        data.pop(k, None)
    for k, v in data.items():
        setattr(p, k, v)
    if body.conditions is not None:
        for r in db.scalars(select(PatientCondition).where(PatientCondition.patient_id == user.id)).all():
            db.delete(r)
        db.add_all([PatientCondition(patient_id=user.id, condition_text=c) for c in body.conditions])
    if body.allergies is not None or body.medications is not None:
        for r in db.scalars(select(MedicationAllergy).where(MedicationAllergy.patient_id == user.id)).all():
            if (r.kind == "allergy" and body.allergies is not None) or (r.kind == "medication" and body.medications is not None):
                db.delete(r)
        db.add_all([MedicationAllergy(patient_id=user.id, item=a, kind="allergy") for a in body.allergies or []])
        db.add_all([MedicationAllergy(patient_id=user.id, item=m, kind="medication") for m in body.medications or []])
    db.commit()
    return _profile_out(db, p)


@router.put("/patients/me/preferences")
def put_prefs(body: PrefIn, user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if data.get("budget") and data["budget"] not in BUDGETS:
        raise AppError(400, "invalid_budget", "Budget must be a band: low, medium, high or flexible")
    if data.get("care_pref") and not set(data["care_pref"]) <= CARE:
        raise AppError(400, "invalid_care_pref", "Unknown care type")
    pref = db.get(PatientPreference, user.id) or PatientPreference(patient_id=user.id)
    for k, v in data.items():
        setattr(pref, k, v)
    db.add(pref)
    db.commit()
    return {k: getattr(pref, k) for k in ("budget", "care_pref", "travel_limit_km", "transport_difficulty",
                                           "assistance_need", "visible_to_doctor")}


@router.get("/patients/me/preferences")
def get_prefs(user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    pref = db.get(PatientPreference, user.id)
    if not pref:
        return {"budget": None, "care_pref": [], "travel_limit_km": None, "transport_difficulty": False,
                "assistance_need": False, "visible_to_doctor": False}
    return {k: getattr(pref, k) for k in ("budget", "care_pref", "travel_limit_km", "transport_difficulty",
                                           "assistance_need", "visible_to_doctor")}


@router.get("/patients/me/dashboard")
def dashboard(user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    p = db.get(PatientProfile, user.id)
    if not p.onboarding_completed:
        raise AppError(403, "onboarding_required", "Complete onboarding first")
    appt = db.scalars(select(Appointment).where(
        Appointment.patient_id == user.id, Appointment.status.in_(["requested", "confirmed", "rescheduled"]))
        .order_by(Appointment.slot_start)).first()
    doc = db.scalars(select(Document).where(Document.patient_id == user.id).order_by(Document.created_at.desc())).first()
    obs = db.scalars(select(Observation).where(Observation.patient_id == user.id)
                     .order_by(Observation.observed_on.desc()).limit(3)).all()
    unread = len(db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))).all())
    return {
        "greeting_name": p.full_name,
        "next_appointment": None if not appt else {"id": appt.id, "status": appt.status, "slot_start": appt.slot_start},
        "latest_report": None if not doc else {"id": doc.id, "status": doc.status, "doc_type": doc.doc_type,
                                              "created_at": doc.created_at},
        "snapshot": [{"test_code": o.test_code, "value": o.value_raw, "unit": o.unit, "observed_on": o.observed_on,
                      "status": o.status, "low_confidence": o.low_confidence} for o in obs],
        "unread_notifications": unread,
        "emergency_number": "999",
    }


@router.get("/notifications")
def notifications(user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id)
                      .order_by(Notification.sent_at.desc()).limit(50)).all()
    return {"items": [{"id": n.id, "template": n.template, "payload": n.payload, "read_at": n.read_at,
                       "sent_at": n.sent_at} for n in rows]}


@router.patch("/notifications/{nid}/read")
def read_notification(nid: str, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if not n or n.user_id != user.id:
        raise AppError(404, "not_found", "Notification not found")
    n.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": n.id, "read_at": n.read_at}


def notify(db: Session, user_id: str, template: str, payload: dict | None = None):
    db.add(Notification(user_id=user_id, template=template, payload=payload or {}))
    db.commit()
