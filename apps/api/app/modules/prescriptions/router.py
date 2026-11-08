import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

try:
    import pymupdf as fitz
except ImportError:
    import fitz  # type: ignore

from app.core import audit
from app.core.access import decide, require_access
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import get_current_user, require_role
from app.models import (
    Appointment,
    DoctorProfile,
    Facility,
    PatientProfile,
    Prescription,
    Profile,
)
from app.modules.patients.router import notify

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


class MedicationItem(BaseModel):
    name: str = Field(..., min_length=1)
    dosage: str = Field(default="")
    frequency: str = Field(default="")
    duration: str = Field(default="")
    instructions: str = Field(default="")


class PrescriptionDraftIn(BaseModel):
    patient_id: str
    appointment_id: str | None = None
    diagnosis: str | None = None
    clinical_notes: str | None = None
    medications: list[MedicationItem] = Field(default_factory=list)
    follow_up_recommendation: str | None = None


class PrescriptionUpdateIn(BaseModel):
    diagnosis: str | None = None
    clinical_notes: str | None = None
    medications: list[MedicationItem] = Field(default_factory=list)
    follow_up_recommendation: str | None = None


class PrescriptionCancelIn(BaseModel):
    reason: str = Field(..., min_length=3)


class PrescriptionAmendIn(BaseModel):
    amendment_note: str = Field(..., min_length=3)
    diagnosis: str | None = None
    clinical_notes: str | None = None
    medications: list[MedicationItem] = Field(default_factory=list)
    follow_up_recommendation: str | None = None


def _prescription_view(p: Prescription, db: Session):
    patient = db.get(PatientProfile, p.patient_id)
    doc = db.get(DoctorProfile, p.doctor_id)
    appt = db.get(Appointment, p.appointment_id) if p.appointment_id else None
    facility = db.get(Facility, appt.facility_id) if (appt and appt.facility_id) else None

    return {
        "id": p.id,
        "patient_id": p.patient_id,
        "patient_name": patient.full_name if patient else "Patient",
        "patient_dob": patient.dob if patient else None,
        "patient_sex": patient.sex if patient else None,
        "doctor_id": p.doctor_id,
        "doctor_name": doc.full_name if doc else "Doctor",
        "doctor_specialty": doc.specialty_id if doc else None,
        "doctor_qualifications": doc.qualifications if doc else [],
        "doctor_bmdc": doc.bmdc_number if (doc and doc.verification == "verified") else None,
        "facility_name": facility.name if facility else None,
        "appointment_id": p.appointment_id,
        "diagnosis": p.diagnosis,
        "clinical_notes": p.clinical_notes,
        "medications": p.medications or [],
        "follow_up_recommendation": p.follow_up_recommendation,
        "status": p.status,
        "version": p.version,
        "issued_at": p.issued_at,
        "consultation_date": p.consultation_date,
        "amendment_note": p.amendment_note,
        "cancellation_reason": p.cancellation_reason,
        "original_prescription_id": p.original_prescription_id,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


def _generate_prescription_pdf(p: Prescription, db: Session) -> bytes:
    """Generate a clean clinical PDF for the doctor-approved prescription using PyMuPDF."""
    doc_view = _prescription_view(p, db)
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 standard

    # Color palette
    p_dark = (0.05, 0.28, 0.35)
    p_gray = (0.4, 0.45, 0.5)
    p_black = (0.1, 0.1, 0.1)
    p_bg = (0.95, 0.97, 0.98)

    # Top Header banner box
    page.draw_rect(fitz.Rect(36, 36, 559, 115), color=None, fill=p_bg)
    page.draw_rect(fitz.Rect(36, 36, 559, 115), color=p_dark, width=1.2)

    page.insert_text(fitz.Point(50, 62), "MEDIBRIDGE AI CLINICAL HEALTHCARE", fontsize=15, color=p_dark, fontname="helv")
    page.insert_text(fitz.Point(50, 78), "DIGITAL CLINICAL PRESCRIPTION", fontsize=11, color=p_dark, fontname="helv")

    # Doctor Credentials on Right side of Header
    doc_name = doc_view["doctor_name"]
    doc_bmdc = f"BMDC Reg: {doc_view['doctor_bmdc']}" if doc_view["doctor_bmdc"] else "BMDC: Verified Practitioner"
    page.insert_text(fitz.Point(340, 60), doc_name, fontsize=12, color=p_black, fontname="helv")
    page.insert_text(fitz.Point(340, 74), doc_bmdc, fontsize=9, color=p_gray, fontname="helv")
    if doc_view["facility_name"]:
        page.insert_text(fitz.Point(340, 88), f"Chamber: {doc_view['facility_name']}", fontsize=8.5, color=p_gray, fontname="helv")
    consult_dt = p.consultation_date.strftime("%Y-%m-%d %H:%M") if p.consultation_date else "N/A"
    page.insert_text(fitz.Point(340, 102), f"Consultation Date: {consult_dt}", fontsize=8.5, color=p_gray, fontname="helv")

    # Patient Details Bar
    y = 135
    page.draw_rect(fitz.Rect(36, y, 559, y + 36), color=p_gray, width=0.5, fill=(0.98, 0.98, 0.98))
    page.insert_text(fitz.Point(50, y + 22), f"Patient: {doc_view['patient_name']}", fontsize=10, color=p_black, fontname="helv")
    age_sex = []
    if doc_view["patient_sex"]:
        age_sex.append(f"Sex: {doc_view['patient_sex'].capitalize()}")
    if doc_view["patient_dob"]:
        age_sex.append(f"DOB: {doc_view['patient_dob']}")
    page.insert_text(fitz.Point(260, y + 22), " · ".join(age_sex) if age_sex else "Patient Details Verified", fontsize=9, color=p_gray, fontname="helv")
    rx_id_short = p.id[:8].upper()
    page.insert_text(fitz.Point(440, y + 22), f"Rx ID: MB-{rx_id_short}", fontsize=9, color=p_dark, fontname="helv")

    # Status watermark or notice if not issued
    if p.status != "issued":
        page.insert_text(fitz.Point(50, y + 55), f"*** STATUS: {p.status.upper()} - NOT AN OFFICIAL DISPENSED PRESCRIPTION ***", fontsize=10, color=(0.85, 0.2, 0.2), fontname="helv")
        y += 24

    # Diagnosis / Clinical Indication
    y += 50
    page.insert_text(fitz.Point(50, y), "Clinical Diagnosis / Chief Indication:", fontsize=10, color=p_dark, fontname="helv")
    y += 16
    diag_text = p.diagnosis.strip() if p.diagnosis else "General medical review and symptom assessment."
    page.insert_text(fitz.Point(50, y), diag_text, fontsize=9.5, color=p_black, fontname="helv")

    # Rx Symbol & Medications Table
    y += 35
    page.insert_text(fitz.Point(50, y), "Rx (Prescribed Medications)", fontsize=13, color=p_dark, fontname="helv")
    y += 12

    # Table Header
    page.draw_rect(fitz.Rect(36, y, 559, y + 20), color=None, fill=p_dark)
    page.insert_text(fitz.Point(45, y + 14), "#", fontsize=8.5, color=(1, 1, 1), fontname="helv")
    page.insert_text(fitz.Point(70, y + 14), "Medication & Dosage", fontsize=8.5, color=(1, 1, 1), fontname="helv")
    page.insert_text(fitz.Point(240, y + 14), "Frequency", fontsize=8.5, color=(1, 1, 1), fontname="helv")
    page.insert_text(fitz.Point(340, y + 14), "Duration", fontsize=8.5, color=(1, 1, 1), fontname="helv")
    page.insert_text(fitz.Point(420, y + 14), "Instructions", fontsize=8.5, color=(1, 1, 1), fontname="helv")
    y += 20

    meds = p.medications or []
    if meds:
        for idx, m in enumerate(meds, start=1):
            bg_color = (0.97, 0.97, 0.97) if idx % 2 == 0 else (1, 1, 1)
            page.draw_rect(fitz.Rect(36, y, 559, y + 26), color=p_gray, width=0.3, fill=bg_color)
            med_name_dose = f"{m.get('name', '')} {m.get('dosage', '')}".strip()
            page.insert_text(fitz.Point(45, y + 17), str(idx), fontsize=8.5, color=p_black, fontname="helv")
            page.insert_text(fitz.Point(70, y + 17), med_name_dose[:32], fontsize=9, color=p_black, fontname="helv")
            page.insert_text(fitz.Point(240, y + 17), str(m.get("frequency", "As directed"))[:18], fontsize=8.5, color=p_black, fontname="helv")
            page.insert_text(fitz.Point(340, y + 17), str(m.get("duration", "N/A"))[:15], fontsize=8.5, color=p_black, fontname="helv")
            page.insert_text(fitz.Point(420, y + 17), str(m.get("instructions", "After meals"))[:26], fontsize=8, color=p_gray, fontname="helv")
            y += 26
    else:
        page.draw_rect(fitz.Rect(36, y, 559, y + 24), color=p_gray, width=0.3, fill=(1, 1, 1))
        page.insert_text(fitz.Point(50, y + 16), "No pharmacological medications prescribed in this consultation note.", fontsize=8.5, color=p_gray, fontname="helv")
        y += 24

    # Clinical Advice & Lifestyle notes
    y += 30
    page.insert_text(fitz.Point(50, y), "Clinical Advice & Dietary Guidelines:", fontsize=10, color=p_dark, fontname="helv")
    y += 16
    notes_text = p.clinical_notes.strip() if p.clinical_notes else "Maintain adequate hydration, balanced diet, and monitor vital signs as advised."
    # Wrap text if long
    page.insert_text(fitz.Point(50, y), notes_text[:140], fontsize=9, color=p_black, fontname="helv")

    # Follow-up
    y += 30
    page.insert_text(fitz.Point(50, y), "Follow-Up Recommendation:", fontsize=10, color=p_dark, fontname="helv")
    y += 16
    follow_text = p.follow_up_recommendation.strip() if p.follow_up_recommendation else "Return for clinical follow-up as directed by your physician or if symptoms persist."
    page.insert_text(fitz.Point(50, y), follow_text[:140], fontsize=9, color=p_black, fontname="helv")

    # Footer signature block
    sig_y = 700
    page.draw_rect(fitz.Rect(36, sig_y, 559, 790), color=p_gray, width=0.5, fill=p_bg)
    page.insert_text(fitz.Point(50, sig_y + 20), "DIGITAL VERIFICATION & DOCTOR APPROVAL", fontsize=9, color=p_dark, fontname="helv")
    issued_str = p.issued_at.strftime("%Y-%m-%d %H:%M UTC") if p.issued_at else "Draft / In-Review"
    page.insert_text(fitz.Point(50, sig_y + 35), f"Issuing Doctor: {doc_name} | {doc_bmdc}", fontsize=8.5, color=p_black, fontname="helv")
    page.insert_text(fitz.Point(50, sig_y + 48), f"Approved & Issued At: {issued_str}", fontsize=8.5, color=p_gray, fontname="helv")

    # Doctor signature line on the right
    page.draw_line(fitz.Point(380, sig_y + 50), fitz.Point(530, sig_y + 50), color=p_dark, width=1)
    page.insert_text(fitz.Point(400, sig_y + 64), "Doctor Signature", fontsize=8.5, color=p_dark, fontname="helv")

    # Disclaimer
    page.insert_text(
        fitz.Point(50, 808),
        "Notice: This is a verified digital clinical prescription. Patients should follow medical directions accurately. Emergency: Dial 999.",
        fontsize=7,
        color=p_gray,
        fontname="helv",
    )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@router.post("/draft")
def create_draft(
    body: PrescriptionDraftIn,
    user: Profile = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Create a draft prescription for an authorized patient."""
    require_access(db, user, body.patient_id, "notes", "prescribe")
    dp = db.get(DoctorProfile, user.id)
    if not dp:
        raise AppError(404, "doctor_not_found", "Doctor profile not configured")

    meds_data = [m.model_dump() for m in body.medications]
    p = Prescription(
        patient_id=body.patient_id,
        doctor_id=user.id,
        appointment_id=body.appointment_id,
        diagnosis=body.diagnosis,
        clinical_notes=body.clinical_notes,
        medications=meds_data,
        follow_up_recommendation=body.follow_up_recommendation,
        status="draft",
        version=1,
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    audit.log(
        db,
        user,
        "prescriptions.draft",
        resource_type="prescription",
        resource_id=p.id,
        patient_id=body.patient_id,
    )
    return _prescription_view(p, db)


@router.put("/{prescription_id}")
def update_draft(
    prescription_id: str,
    body: PrescriptionUpdateIn,
    user: Profile = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Update a draft prescription. Issued prescriptions cannot be silently edited."""
    p = db.get(Prescription, prescription_id)
    if not p or p.doctor_id != user.id:
        raise AppError(404, "not_found", "Prescription not found")

    require_access(db, user, p.patient_id, "notes", "edit")

    if p.status != "draft":
        raise AppError(
            409,
            "prescription_locked",
            f"Prescription status is '{p.status}'. Issued prescriptions cannot be silently edited. Please issue an amendment or cancel instead.",
        )

    if body.diagnosis is not None:
        p.diagnosis = body.diagnosis
    if body.clinical_notes is not None:
        p.clinical_notes = body.clinical_notes
    if body.medications is not None:
        p.medications = [m.model_dump() for m in body.medications]
    if body.follow_up_recommendation is not None:
        p.follow_up_recommendation = body.follow_up_recommendation

    p.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(p)

    audit.log(
        db,
        user,
        "prescriptions.update",
        resource_type="prescription",
        resource_id=p.id,
        patient_id=p.patient_id,
    )
    return _prescription_view(p, db)


@router.post("/{prescription_id}/issue")
def issue_prescription(
    prescription_id: str,
    user: Profile = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Approve and issue a prescription. Only verified doctors can issue prescriptions."""
    dp = db.get(DoctorProfile, user.id)
    if not dp or dp.verification != "verified":
        raise AppError(403, "doctor_not_verified", "Only verified medical practitioners can approve and issue prescriptions")

    p = db.get(Prescription, prescription_id)
    if not p or p.doctor_id != user.id:
        raise AppError(404, "not_found", "Prescription not found")

    require_access(db, user, p.patient_id, "notes", "issue")

    if p.status == "issued":
        raise AppError(409, "already_issued", "Prescription has already been approved and issued")
    if p.status == "cancelled":
        raise AppError(409, "prescription_cancelled", "Cannot issue a cancelled prescription")

    if not p.medications and not (p.clinical_notes and p.clinical_notes.strip()):
        raise AppError(400, "empty_prescription", "Cannot issue an empty prescription with no medications or clinical advice")

    p.status = "issued"
    p.issued_at = datetime.now(timezone.utc)
    p.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(p)

    # Log audit event
    audit.log(
        db,
        user,
        "prescriptions.issue",
        resource_type="prescription",
        resource_id=p.id,
        patient_id=p.patient_id,
    )

    # Send in-app notification to patient
    notify(
        db,
        p.patient_id,
        "prescription_issued",
        {
            "prescription_id": p.id,
            "doctor_id": user.id,
            "doctor_name": dp.full_name,
            "issued_at": p.issued_at.isoformat(),
            "medication_count": len(p.medications or []),
        },
    )

    return _prescription_view(p, db)


@router.post("/{prescription_id}/cancel")
def cancel_prescription(
    prescription_id: str,
    body: PrescriptionCancelIn,
    user: Profile = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Cancel an issued prescription with a required clinical cancellation reason."""
    p = db.get(Prescription, prescription_id)
    if not p or p.doctor_id != user.id:
        raise AppError(404, "not_found", "Prescription not found")

    require_access(db, user, p.patient_id, "notes", "cancel")

    if p.status == "cancelled":
        raise AppError(409, "already_cancelled", "Prescription is already cancelled")

    p.status = "cancelled"
    p.cancellation_reason = body.reason.strip()
    p.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(p)

    dp = db.get(DoctorProfile, user.id)
    audit.log(
        db,
        user,
        "prescriptions.cancel",
        resource_type="prescription",
        resource_id=p.id,
        patient_id=p.patient_id,
        reason=body.reason,
    )

    notify(
        db,
        p.patient_id,
        "prescription_cancelled",
        {
            "prescription_id": p.id,
            "doctor_name": dp.full_name if dp else "Doctor",
            "reason": body.reason,
        },
    )
    return _prescription_view(p, db)


@router.post("/{prescription_id}/amend")
def amend_prescription(
    prescription_id: str,
    body: PrescriptionAmendIn,
    user: Profile = Depends(require_role("doctor")),
    db: Session = Depends(get_db),
):
    """Amend an issued prescription by creating an explicit version linked to original."""
    dp = db.get(DoctorProfile, user.id)
    if not dp or dp.verification != "verified":
        raise AppError(403, "doctor_not_verified", "Only verified medical practitioners can amend prescriptions")

    p = db.get(Prescription, prescription_id)
    if not p or p.doctor_id != user.id:
        raise AppError(404, "not_found", "Prescription not found")

    require_access(db, user, p.patient_id, "notes", "amend")

    # Mark original prescription as amended
    p.status = "amended"
    p.updated_at = datetime.now(timezone.utc)

    # Create new prescription version
    meds_data = [m.model_dump() for m in body.medications] if body.medications else (p.medications or [])
    new_p = Prescription(
        patient_id=p.patient_id,
        doctor_id=user.id,
        appointment_id=p.appointment_id,
        diagnosis=body.diagnosis or p.diagnosis,
        clinical_notes=body.clinical_notes or p.clinical_notes,
        medications=meds_data,
        follow_up_recommendation=body.follow_up_recommendation or p.follow_up_recommendation,
        status="issued",
        version=p.version + 1,
        issued_at=datetime.now(timezone.utc),
        amendment_note=body.amendment_note,
        original_prescription_id=p.id,
    )
    db.add(new_p)
    db.commit()
    db.refresh(new_p)

    audit.log(
        db,
        user,
        "prescriptions.amend",
        resource_type="prescription",
        resource_id=new_p.id,
        patient_id=p.patient_id,
        reason=body.amendment_note,
    )

    notify(
        db,
        p.patient_id,
        "prescription_amended",
        {
            "original_prescription_id": p.id,
            "new_prescription_id": new_p.id,
            "doctor_name": dp.full_name,
            "amendment_note": body.amendment_note,
        },
    )

    return _prescription_view(new_p, db)


@router.get("/patient/{patient_id}")
def list_patient_prescriptions(
    patient_id: str,
    user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List prescriptions for a patient (checked by access control)."""
    pid = user.id if patient_id == "me" else patient_id
    if user.role == "patient" and user.id != pid:
        raise AppError(403, "forbidden", "Patients can only access their own prescriptions")
    if user.role == "doctor":
        require_access(db, user, pid, "notes", "list_prescriptions")

    q = select(Prescription).where(Prescription.patient_id == pid).order_by(Prescription.created_at.desc())
    if user.role == "patient":
        # Patients only see issued, amended, or cancelled official prescriptions (not in-progress drafts)
        q = q.where(Prescription.status.in_(["issued", "amended", "cancelled"]))

    rows = db.scalars(q).all()
    return {"items": [_prescription_view(p, db) for p in rows]}


@router.get("/me")
def my_prescriptions(
    user: Profile = Depends(require_role("patient")),
    db: Session = Depends(get_db),
):
    """Patient convenience endpoint to list own prescriptions."""
    rows = db.scalars(
        select(Prescription)
        .where(Prescription.patient_id == user.id, Prescription.status.in_(["issued", "amended", "cancelled"]))
        .order_by(Prescription.created_at.desc())
    ).all()
    return {"items": [_prescription_view(p, db) for p in rows]}


@router.get("/{prescription_id}")
def get_prescription(
    prescription_id: str,
    user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single prescription details."""
    p = db.get(Prescription, prescription_id)
    if not p:
        raise AppError(404, "not_found", "Prescription not found")

    if user.role == "patient":
        if p.patient_id != user.id:
            raise AppError(403, "forbidden", "You are not authorized to view this prescription")
        if p.status == "draft":
            raise AppError(404, "not_found", "Draft prescriptions are not published to patient records yet")
    elif user.role == "doctor":
        require_access(db, user, p.patient_id, "notes", "view_prescription")
    else:
        raise AppError(403, "forbidden", "Role not authorized to access medical prescriptions")

    return _prescription_view(p, db)


@router.get("/{prescription_id}/pdf")
def download_prescription_pdf(
    prescription_id: str,
    user: Profile = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download doctor-issued clinical prescription as PDF."""
    p = db.get(Prescription, prescription_id)
    if not p:
        raise AppError(404, "not_found", "Prescription not found")

    if user.role == "patient":
        if p.patient_id != user.id:
            raise AppError(403, "forbidden", "You cannot download prescriptions of another patient")
        if p.status == "draft":
            raise AppError(400, "prescription_draft", "Draft prescriptions cannot be exported as official PDFs")
    elif user.role == "doctor":
        require_access(db, user, p.patient_id, "notes", "download_prescription_pdf")
    else:
        raise AppError(403, "forbidden", "Role not authorized to access medical prescriptions")

    pdf_bytes = _generate_prescription_pdf(p, db)
    filename = f"prescription-{p.id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
