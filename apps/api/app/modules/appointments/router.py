from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core import audit
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import get_current_user, require_role
from app.models import (Appointment, AppointmentEvent, AvailabilitySlot, CareRelationship, Consent, DoctorProfile,
                        Facility, FacilityStaff, PatientProfile, Profile)
from app.modules.patients.router import notify

router = APIRouter(tags=["appointments"])
ACTIVE = ["requested", "confirmed", "rescheduled", "checked_in"]
TRANSITIONS = {
    "requested": {"confirmed", "cancelled"},
    "confirmed": {"checked_in", "cancelled", "no_show", "rescheduled"},
    "rescheduled": {"confirmed", "cancelled"},
    "checked_in": {"completed"},
}


class ApptIn(BaseModel):
    doctor_id: str
    facility_id: str | None = None
    slot_id: str | None = None
    slot_start: datetime | None = None
    reason: str | None = None
    share_document_ids: list[str] = []
    share_opt_in: bool = False


class StatusIn(BaseModel):
    status: str
    slot_start: datetime | None = None


def _aware(dt):
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _view(a: Appointment, db: Session, minimal=False):
    pat = db.get(PatientProfile, a.patient_id)
    doc = db.get(DoctorProfile, a.doctor_id)
    out = {"id": a.id, "status": a.status, "slot_start": a.slot_start, "slot_end": a.slot_end, "doctor_id": a.doctor_id,
           "doctor_name": doc.full_name if doc else None, "facility_id": a.facility_id,
           "patient_name": pat.full_name if pat else None, "patient_id": a.patient_id}
    if not minimal:
        out["reason"] = a.reason
        out["share_opt_in"] = a.share_opt_in
    events = db.scalars(select(AppointmentEvent).where(AppointmentEvent.appointment_id == a.id).order_by(AppointmentEvent.at)).all()
    out["events"] = [{"from": e.from_status, "to": e.to_status, "at": e.at} for e in events]
    return out


def _facility_scope(user: Profile):
    return user.facility_id if user.role in ("facility_admin", "facility_staff") else None


@router.post("/appointments")
def create(body: ApptIn, idempotency_key: str | None = Header(default=None),
           user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    key = f"{user.id}:{idempotency_key}" if idempotency_key else None
    if key:
        prior = db.scalar(select(Appointment).where(Appointment.idempotency_key == key))
        if prior:
            return _view(prior, db)
    doc = db.get(DoctorProfile, body.doctor_id)
    if not doc:
        raise AppError(404, "not_found", "Doctor not found")
    slot_start, slot_end, slot = body.slot_start, None, None
    if body.slot_id:
        slot = db.get(AvailabilitySlot, body.slot_id)
        if not slot or slot.doctor_id != body.doctor_id:
            raise AppError(404, "slot_not_found", "Slot not found")
        # Atomic claim: a single UPDATE with the capacity check in its WHERE clause, so two concurrent
        # requests can never both succeed (no read-then-write race).
        claimed = db.execute(update(AvailabilitySlot).where(AvailabilitySlot.id == slot.id,
                             AvailabilitySlot.booked < AvailabilitySlot.capacity).values(booked=AvailabilitySlot.booked + 1))
        if claimed.rowcount != 1:
            db.rollback()
            raise AppError(409, "slot_full", "This slot is already booked")
        slot_start, slot_end = slot.start, slot.end
    elif slot_start:
        clash = db.scalar(select(Appointment).where(Appointment.doctor_id == body.doctor_id,
                                                    Appointment.slot_start == slot_start, Appointment.status.in_(ACTIVE)))
        if clash:
            raise AppError(409, "slot_full", "This time is already booked")
    a = Appointment(patient_id=user.id, doctor_id=body.doctor_id, facility_id=body.facility_id,
                    slot_id=body.slot_id, slot_start=slot_start, slot_end=slot_end, reason=body.reason,
                    share_document_ids=body.share_document_ids, share_opt_in=body.share_opt_in,
                    idempotency_key=key, created_by=user.id)
    db.add(a)
    try:
        db.flush()
        db.add(AppointmentEvent(appointment_id=a.id, from_status=None, to_status="requested", actor_id=user.id))
        db.commit()
    except IntegrityError:
        db.rollback()   # unique index on (doctor, start) or idempotency key fired under concurrency
        if key:
            prior = db.scalar(select(Appointment).where(Appointment.idempotency_key == key))
            if prior:
                return _view(prior, db)
        raise AppError(409, "slot_full", "This time is already booked")
    notify(db, body.doctor_id, "appointment_requested", {"appointment_id": a.id})
    audit.log(db, user, "appointments.create", resource_type="appointment", resource_id=a.id, patient_id=user.id)
    return _view(a, db)


@router.get("/appointments")
def list_appts(user: Profile = Depends(get_current_user), db: Session = Depends(get_db), status: str | None = None):
    q = select(Appointment).order_by(Appointment.slot_start)
    minimal = False
    if user.role == "patient":
        q = q.where(Appointment.patient_id == user.id)
    elif user.role == "doctor":
        q = q.where(Appointment.doctor_id == user.id)
    elif user.role in ("facility_admin", "facility_staff"):
        q = q.where(Appointment.facility_id == user.facility_id)
        minimal = True    # staff see only the minimum patient data
    else:
        raise AppError(403, "forbidden", "Role cannot list appointments")
    if status:
        q = q.where(Appointment.status == status)
    return {"items": [_view(a, db, minimal) for a in db.scalars(q).all()]}


@router.patch("/appointments/{appt_id}/status")
def set_status(appt_id: str, body: StatusIn, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.get(Appointment, appt_id)
    if not a:
        raise AppError(404, "not_found", "Appointment not found")
    # actor scoping
    if user.role == "patient":
        if a.patient_id != user.id or body.status != "cancelled":
            raise AppError(403, "forbidden", "Patients can only cancel their own appointments")
    elif user.role == "doctor":
        if a.doctor_id != user.id:
            raise AppError(403, "forbidden", "Not your appointment")
    elif user.role in ("facility_admin", "facility_staff"):
        if a.facility_id != user.facility_id:
            raise AppError(403, "forbidden", "Not your facility's appointment")
    else:
        raise AppError(403, "forbidden", "Role cannot change appointments")
    if body.status not in TRANSITIONS.get(a.status, set()):
        raise AppError(409, "illegal_transition", f"Cannot go from {a.status} to {body.status}")
    prev = a.status
    a.status = body.status
    if body.status == "rescheduled" and body.slot_start:
        clash = db.scalar(select(Appointment).where(Appointment.doctor_id == a.doctor_id, Appointment.slot_start == body.slot_start,
                                                    Appointment.status.in_(ACTIVE), Appointment.id != a.id))
        if clash:
            raise AppError(409, "slot_full", "That time is already booked")
        a.slot_start = body.slot_start
    if body.status in ("cancelled",) and a.slot_id:
        db.execute(update(AvailabilitySlot).where(AvailabilitySlot.id == a.slot_id, AvailabilitySlot.booked > 0)
                   .values(booked=AvailabilitySlot.booked - 1))
    db.add(AppointmentEvent(appointment_id=a.id, from_status=prev, to_status=a.status, actor_id=user.id))
    if body.status == "confirmed":
        _on_confirm(db, a)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(409, "slot_full", "That time is already booked")
    for uid in {a.patient_id, a.doctor_id} - {user.id}:
        notify(db, uid, f"appointment_{a.status}", {"appointment_id": a.id})
    audit.log(db, user, "appointments.status", resource_type="appointment", resource_id=a.id, patient_id=a.patient_id,
              before={"status": prev}, after={"status": a.status})
    return _view(a, db)


def _on_confirm(db: Session, a: Appointment):
    rel = db.scalar(select(CareRelationship).where(CareRelationship.patient_id == a.patient_id,
                                                   CareRelationship.doctor_id == a.doctor_id))
    if not rel:
        db.add(CareRelationship(patient_id=a.patient_id, doctor_id=a.doctor_id, facility_id=a.facility_id,
                                origin="appointment"))
    elif not rel.active:
        rel.active, rel.ended_at = True, None
    if a.share_opt_in:   # only if the patient opted in at request time
        res = ["profile", "documents", "observations", "notes"]
        db.add(Consent(patient_id=a.patient_id, consent_type="doctor_share", grantee_id=a.doctor_id,
                       scope={"resources": res, "document_ids": a.share_document_ids or None},
                       expires_at=datetime.now(timezone.utc) + timedelta(days=30)))


@router.get("/doctors/{doctor_id}/slots")
def slots(doctor_id: str, db: Session = Depends(get_db)):
    rows = db.scalars(select(AvailabilitySlot).where(AvailabilitySlot.doctor_id == doctor_id,
                                                     AvailabilitySlot.start > datetime.now(timezone.utc))
                      .order_by(AvailabilitySlot.start)).all()
    return {"items": [{"id": s.id, "start": s.start, "end": s.end, "facility_id": s.facility_id,
                       "available": s.booked < s.capacity} for s in rows]}
