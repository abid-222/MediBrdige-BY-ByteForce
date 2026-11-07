from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core import audit
from app.core.access import decide, require_access
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import require_role
from app.models import (CareRelationship, ClinicalNote, ClinicalNoteVersion, Document, DoctorProfile, Observation,
                        PatientProfile, Profile, Appointment)

router = APIRouter(tags=["clinical"])


class DraftIn(BaseModel):
    patient_id: str
    appointment_id: str | None = None
    text: str = ""
    ai_assisted: bool = False


class TextIn(BaseModel):
    text: str


def _note(n: ClinicalNote, full=True):
    return {"id": n.id, "patient_id": n.patient_id, "doctor_id": n.doctor_id, "status": n.status, "version": n.version,
            "ai_assisted": n.ai_assisted, "signed_at": n.signed_at,
            "text": (n.signed_text if n.status != "draft" else n.draft_text) if full else None,
            "locked": n.status != "draft"}


def _own_note(db, note_id, user) -> ClinicalNote:
    n = db.get(ClinicalNote, note_id)
    if not n or n.doctor_id != user.id:
        raise AppError(404, "not_found", "Note not found")
    return n


@router.post("/clinical-notes/draft")
def draft(body: DraftIn, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    require_access(db, user, body.patient_id, "notes", "draft")
    n = ClinicalNote(patient_id=body.patient_id, doctor_id=user.id, appointment_id=body.appointment_id,
                     draft_text=body.text, ai_assisted=body.ai_assisted)
    db.add(n)
    db.flush()
    db.add(ClinicalNoteVersion(note_id=n.id, version=1, text=body.text, kind="draft", author_id=user.id))
    db.commit()
    return _note(n)


@router.put("/clinical-notes/{note_id}")
def edit(note_id: str, body: TextIn, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    n = _own_note(db, note_id, user)
    require_access(db, user, n.patient_id, "notes", "edit")
    if n.status != "draft":
        raise AppError(409, "note_locked", "Signed notes are immutable. Add an addendum instead.")
    n.draft_text = body.text
    n.version += 1
    db.add(ClinicalNoteVersion(note_id=n.id, version=n.version, text=body.text, kind="draft", author_id=user.id))
    db.commit()
    return _note(n)


@router.post("/clinical-notes/{note_id}/sign")
def sign(note_id: str, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    dp = db.get(DoctorProfile, user.id)
    if not dp or dp.verification != "verified":
        raise AppError(403, "doctor_not_verified", "Only a verified doctor can sign notes")
    n = _own_note(db, note_id, user)
    require_access(db, user, n.patient_id, "notes", "sign")
    if n.status != "draft":
        raise AppError(409, "note_locked", "Note is already signed")
    if not n.draft_text.strip():
        raise AppError(400, "empty_note", "Cannot sign an empty note")
    n.signed_text, n.status, n.signed_at = n.draft_text, "signed", datetime.now(timezone.utc)
    n.version += 1
    db.add(ClinicalNoteVersion(note_id=n.id, version=n.version, text=n.signed_text, kind="signed", author_id=user.id))
    db.commit()
    audit.log(db, user, "notes.sign", resource_type="note", resource_id=n.id, patient_id=n.patient_id)
    return _note(n)


@router.post("/clinical-notes/{note_id}/addendum")
def addendum(note_id: str, body: TextIn, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    n = _own_note(db, note_id, user)
    require_access(db, user, n.patient_id, "notes", "addendum")
    if n.status == "draft":
        raise AppError(409, "not_signed", "Only signed notes take addenda")
    n.signed_text = (n.signed_text or "") + f"\n\n[Addendum {datetime.now(timezone.utc):%Y-%m-%d %H:%M}] {body.text}"
    n.status = "addended"
    n.version += 1
    db.add(ClinicalNoteVersion(note_id=n.id, version=n.version, text=body.text, kind="addendum", author_id=user.id))
    db.commit()
    audit.log(db, user, "notes.addendum", resource_type="note", resource_id=n.id, patient_id=n.patient_id)
    return _note(n)


@router.get("/clinical-notes/{note_id}/versions")
def versions(note_id: str, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    n = _own_note(db, note_id, user)
    require_access(db, user, n.patient_id, "notes", "history")
    rows = db.scalars(select(ClinicalNoteVersion).where(ClinicalNoteVersion.note_id == n.id).order_by(ClinicalNoteVersion.version)).all()
    return {"items": [{"version": r.version, "kind": r.kind, "text": r.text, "created_at": r.created_at} for r in rows]}


@router.get("/patients/me/notes")
def my_notes(user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    """Unsigned notes NEVER appear in the patient / official record."""
    rows = db.scalars(select(ClinicalNote).where(ClinicalNote.patient_id == user.id,
                                                 ClinicalNote.status.in_(["signed", "addended"]))).all()
    return {"items": [_note(n) for n in rows]}


# ---------- doctor workspace ----------
@router.get("/doctor/dashboard")
def dashboard(user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    appts = db.scalars(select(Appointment).where(Appointment.doctor_id == user.id,
                                                 Appointment.status.in_(["requested", "confirmed", "checked_in"]))
                       .order_by(Appointment.slot_start)).all()
    pending = db.scalars(select(Observation).join(CareRelationship, CareRelationship.patient_id == Observation.patient_id)
                         .where(CareRelationship.doctor_id == user.id, CareRelationship.active.is_(True),
                                Observation.status == "unverified")).all()
    flagged = [o for o in pending if o.low_confidence or o.flagged_wrong]
    return {"appointments": [{"id": a.id, "status": a.status, "slot_start": a.slot_start} for a in appts],
            "pending_review_count": len(pending), "flagged_count": len(flagged)}


@router.get("/doctor/patients")
def patients(user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    rels = db.scalars(select(CareRelationship).where(CareRelationship.doctor_id == user.id,
                                                     CareRelationship.active.is_(True))).all()
    out = []
    for r in rels:
        p = db.get(PatientProfile, r.patient_id)
        ok, why = decide(db, user, r.patient_id, "observations")
        out.append({"patient_id": r.patient_id, "name": p.full_name if p else None, "access": ok, "access_reason": why})
    return {"items": out}


@router.get("/doctor/patients/{patient_id}")
def patient_chart(patient_id: str, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    require_access(db, user, patient_id, "profile", "open_chart")   # every chart open is audited
    p = db.get(PatientProfile, patient_id)
    docs = db.scalars(select(Document).where(Document.patient_id == patient_id)).all() \
        if decide(db, user, patient_id, "documents")[0] else []
    notes = db.scalars(select(ClinicalNote).where(ClinicalNote.patient_id == patient_id, ClinicalNote.doctor_id == user.id)).all()
    return {"patient_id": patient_id, "name": p.full_name, "sex": p.sex, "dob": p.dob,
            "documents": [{"id": d.id, "status": d.status, "doc_type": d.doc_type} for d in docs],
            "notes": [_note(n, full=False) for n in notes]}
