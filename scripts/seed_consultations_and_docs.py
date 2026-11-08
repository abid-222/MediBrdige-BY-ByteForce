"""
MediBridge AI - Seed Demo Consultations, Doctor-Patient Links & Test PDFs
Populates:
1. CareRelationship & Consent between patient1 and doctor1
2. Appointments (requested, confirmed, completed) with rich details
3. Sample CBC and Glucose observations and documents
4. Real downloadable test PDFs in apps/web/public/sample_reports/
"""

import os
import sys
from datetime import datetime, timedelta, timezone

# Add apps/api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

import fitz  # PyMuPDF
from sqlalchemy import select
from app.core.db import SessionLocal
from app.models import (
    Appointment,
    AppointmentEvent,
    CareRelationship,
    Consent,
    DoctorFacility,
    DoctorProfile,
    Document,
    Extraction,
    Facility,
    Observation,
    PatientProfile,
    Profile,
    TestCatalog,
)
from app.modules.documents import service as docsvc

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DIR = os.path.join(ROOT_DIR, "apps", "web", "public", "sample_reports")
UPLOAD_DIR = os.path.join(ROOT_DIR, "apps", "api", "uploads")


def create_styled_pdf(filepath: str, title: str, lab_name: str, patient_name: str, date_str: str, test_lines: list[tuple[str, str, str, str]]):
    """
    Creates a clean, realistic clinical lab report PDF.
    test_lines: list of (Test Name, Value, Unit, Reference Range)
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 size

    # Header Banner
    page.draw_rect(fitz.Rect(40, 40, 555, 95), color=(0.06, 0.5, 0.35), fill=(0.06, 0.5, 0.35))
    page.insert_text((55, 65), "MEDIBRIDGE AI — CLINICAL LABORATORY REPORT", fontsize=14, color=(1, 1, 1), fontname="helv")
    page.insert_text((55, 82), f"{lab_name} · DGHS Accredited Diagnostic Center · Dhaka, Bangladesh", fontsize=9, color=(0.9, 0.95, 0.9), fontname="helv")

    # Patient & Report Meta Box
    page.draw_rect(fitz.Rect(40, 105, 555, 175), color=(0.8, 0.85, 0.9), fill=(0.97, 0.98, 1.0))
    page.insert_text((55, 125), f"Patient Name: {patient_name}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text((55, 142), f"Age / Sex: 38 Yrs / Male", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text((55, 159), f"Patient ID: MB-PAT-2026-001", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))

    page.insert_text((320, 125), f"Report Title: {title}", fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))
    page.insert_text((320, 142), f"Collection Date: {date_str}", fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text((320, 159), f"Report Status: Final Verified", fontsize=9, fontname="helv", color=(0.06, 0.5, 0.35))

    # Test Table Header
    y = 205
    page.draw_rect(fitz.Rect(40, y - 15, 555, y + 10), color=(0.8, 0.8, 0.8), fill=(0.92, 0.94, 0.96))
    page.insert_text((55, y), "TEST PARAMETER", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((240, y), "RESULT", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((330, y), "UNIT", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))
    page.insert_text((420, y), "REFERENCE RANGE", fontsize=9, fontname="helv", color=(0.2, 0.2, 0.2))

    y += 30
    for name, val, unit, ref in test_lines:
        # Subtle separator line
        page.draw_line(fitz.Point(40, y + 8), fitz.Point(555, y + 8), color=(0.9, 0.9, 0.9))
        
        # Insert text
        page.insert_text((55, y), name, fontsize=10, fontname="helv", color=(0.1, 0.1, 0.1))
        page.insert_text((240, y), val, fontsize=10, fontname="helv", color=(0.0, 0.2, 0.6))
        page.insert_text((330, y), unit, fontsize=9, fontname="helv", color=(0.3, 0.3, 0.3))
        page.insert_text((420, y), ref, fontsize=9, fontname="helv", color=(0.4, 0.4, 0.4))
        y += 26

    # Footer Notes & Verification Notice
    y += 30
    page.draw_rect(fitz.Rect(40, y, 555, y + 60), color=(0.85, 0.85, 0.85), fill=(0.98, 0.98, 0.98))
    page.insert_text((55, y + 20), "Clinical Interpretation Notice:", fontsize=8, fontname="helv", color=(0.3, 0.3, 0.3))
    page.insert_text((55, y + 34), "• Results must be interpreted in clinical context by a registered medical practitioner (BMDC).", fontsize=7.5, fontname="helv", color=(0.4, 0.4, 0.4))
    page.insert_text((55, y + 46), "• Automated digital health record sync powered by MediBridge AI Clinical Gate.", fontsize=7.5, fontname="helv", color=(0.4, 0.4, 0.4))

    doc.save(filepath)
    doc.close()
    print(f"Created PDF: {filepath}")


def seed():
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    # 1. Retrieve or verify primary demo users
    patient1 = db.query(Profile).filter(Profile.email == "patient1@demo.medibridge.dev").first()
    doctor1 = db.query(Profile).filter(Profile.email == "doctor1@demo.medibridge.dev").first()

    if not patient1 or not doctor1:
        print("ERROR: patient1 or doctor1 not found. Ensure app.seed has run.")
        return

    # Update doctor1 name and verification
    doc_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == doctor1.id).first()
    if doc_prof:
        doc_prof.full_name = "Dr. Rahim Ahmed"
        doc_prof.verification = "verified"
        doc_prof.experience_years = 14
        doc_prof.qualifications = ["MBBS", "FCPS (Medicine)", "MRCP (UK)"]
        doc_prof.last_verified_at = now - timedelta(days=5)

    pat_prof = db.query(PatientProfile).filter(PatientProfile.user_id == patient1.id).first()
    if pat_prof:
        pat_prof.full_name = "Mohammad Anisur Rahman"
        pat_prof.phone = "01712345678"
        pat_prof.dob = "1988-05-14"
        pat_prof.sex = "male"
        pat_prof.onboarding_completed = True

    db.commit()

    # 2. Establish Active CareRelationship & Consent
    care_rel = db.query(CareRelationship).filter(
        CareRelationship.patient_id == patient1.id,
        CareRelationship.doctor_id == doctor1.id
    ).first()
    if not care_rel:
        care_rel = CareRelationship(
            patient_id=patient1.id,
            doctor_id=doctor1.id,
            origin="appointment",
            active=True
        )
        db.add(care_rel)
    else:
        care_rel.active = True
        care_rel.ended_at = None

    # Unexpired 180-day Consent
    consent = db.query(Consent).filter(
        Consent.patient_id == patient1.id,
        Consent.grantee_id == doctor1.id,
        Consent.consent_type == "doctor_share",
        Consent.revoked_at.is_(None)
    ).first()
    if not consent:
        consent = Consent(
            patient_id=patient1.id,
            grantee_id=doctor1.id,
            consent_type="doctor_share",
            scope={"resources": ["profile", "documents", "observations", "notes"], "document_ids": None},
            expires_at=now + timedelta(days=180)
        )
        db.add(consent)
    else:
        consent.expires_at = now + timedelta(days=180)

    db.commit()

    # 3. Create Demo Consultations / Appointments
    facility = db.query(Facility).first()
    fac_id = facility.id if facility else None

    # Clear existing demo appointments for clean slate
    db.query(AppointmentEvent).filter(AppointmentEvent.actor_id.in_([patient1.id, doctor1.id])).delete(synchronize_session=False)
    db.query(Appointment).filter(Appointment.patient_id == patient1.id).delete(synchronize_session=False)
    db.commit()

    # Appt 1: Confirmed for Today (11:30 AM)
    today_slot = now.replace(hour=11, minute=30, second=0, microsecond=0)
    appt1 = Appointment(
        patient_id=patient1.id,
        doctor_id=doctor1.id,
        facility_id=fac_id,
        slot_start=today_slot,
        slot_end=today_slot + timedelta(minutes=25),
        status="confirmed",
        reason="Follow-up consultation for Complete Blood Count (CBC) and Blood Glucose review",
        share_opt_in=True,
        created_by=patient1.id
    )
    db.add(appt1)

    # Appt 2: Requested for Next Week
    next_week_slot = (now + timedelta(days=5)).replace(hour=10, minute=0, second=0, microsecond=0)
    appt2 = Appointment(
        patient_id=patient1.id,
        doctor_id=doctor1.id,
        facility_id=fac_id,
        slot_start=next_week_slot,
        slot_end=next_week_slot + timedelta(minutes=20),
        status="requested",
        reason="Persistent headache and fatigue evaluation",
        share_opt_in=True,
        created_by=patient1.id
    )
    db.add(appt2)

    # Appt 3: Completed from Last Week
    past_slot = (now - timedelta(days=7)).replace(hour=15, minute=0, second=0, microsecond=0)
    appt3 = Appointment(
        patient_id=patient1.id,
        doctor_id=doctor1.id,
        facility_id=fac_id,
        slot_start=past_slot,
        slot_end=past_slot + timedelta(minutes=30),
        status="completed",
        reason="Initial health checkup and lab investigation order",
        share_opt_in=True,
        created_by=patient1.id
    )
    db.add(appt3)

    db.commit()
    print("Seeded 3 appointments between patient1 and doctor1 (confirmed, requested, completed).")

    # 4. Generate Test PDF files in apps/web/public/sample_reports/
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    cbc_normal_lines = [
        ("Hemoglobin", "14.2", "g/dL", "12.0 - 16.0"),
        ("Total WBC", "7.5", "10^9/L", "4.0 - 11.0"),
        ("Platelet count", "250", "10^9/L", "150 - 450"),
        ("RBC count", "4.90", "10^12/L", "4.2 - 5.8"),
        ("Hematocrit (PCV)", "42.5", "%", "36.0 - 48.0"),
        ("MCV", "88.0", "fL", "80.0 - 100.0"),
    ]
    cbc_pdf_pub = os.path.join(PUBLIC_DIR, "CBC_Test_Report_Normal.pdf")
    create_styled_pdf(cbc_pdf_pub, "Complete Blood Count (CBC)", "Popular Diagnostic Centre", "Mohammad Anisur Rahman", now.strftime("%d-%b-%Y"), cbc_normal_lines)

    glucose_lines = [
        ("Blood Glucose (Fasting)", "96.0", "mg/dL", "70.0 - 100.0"),
        ("Blood Glucose (Post-Meal)", "138.0", "mg/dL", "70.0 - 140.0"),
    ]
    glucose_pdf_pub = os.path.join(PUBLIC_DIR, "Blood_Glucose_Report.pdf")
    create_styled_pdf(glucose_pdf_pub, "Blood Glucose Fasting & 2h Post-Meal", "Ibn Sina Diagnostic Lab", "Mohammad Anisur Rahman", now.strftime("%d-%b-%Y"), glucose_lines)

    cbc_anemia_lines = [
        ("Hemoglobin", "10.2", "g/dL", "12.0 - 16.0"),
        ("Total WBC", "11.8", "10^9/L", "4.0 - 11.0"),
        ("Platelet count", "190", "10^9/L", "150 - 450"),
        ("RBC count", "3.85", "10^12/L", "4.2 - 5.8"),
        ("Hematocrit (PCV)", "32.0", "%", "36.0 - 48.0"),
        ("MCV", "74.0", "fL", "80.0 - 100.0"),
    ]
    cbc_anemia_pdf_pub = os.path.join(PUBLIC_DIR, "CBC_Mild_Anemia_Report.pdf")
    create_styled_pdf(cbc_anemia_pdf_pub, "Complete Blood Count (Microcytic Anemia)", "Labaid Diagnostic Ltd", "Mohammad Anisur Rahman", (now - timedelta(days=14)).strftime("%d-%b-%Y"), cbc_anemia_lines)

    # 5. Pre-seed Observations for patient1 so doctor can immediately view & verify
    # Clear previous sample observations for patient1
    db.query(Observation).filter(Observation.patient_id == patient1.id).delete(synchronize_session=False)
    db.commit()

    demo_doc = Document(
        patient_id=patient1.id,
        uploaded_by=patient1.id,
        file_ref=cbc_pdf_pub,
        mime="application/pdf",
        status="processed",
        doc_type="cbc",
        page_count=1,
        is_sample=True
    )
    db.add(demo_doc)
    db.flush()

    raw_text = """Complete Blood Count (CBC)
Hemoglobin: 14.2 g/dL 12.0 - 16.0
Total WBC: 7.5 10^9/L 4.0 - 11.0
Platelet count: 250 10^9/L 150 - 450
RBC count: 4.90 10^12/L 4.2 - 5.8
Hematocrit (PCV): 42.5 % 36.0 - 48.0
MCV: 88.0 fL 80.0 - 100.0
Blood Glucose: 96.0 mg/dL 70.0 - 100.0
"""
    db.add(Extraction(
        document_id=demo_doc.id,
        raw_text=raw_text,
        extractor_version="pymupdf-regex-v1"
    ))

    # Add Observations (3 unverified for doctor to verify, 1 verified)
    obs_list = [
        Observation(
            patient_id=patient1.id,
            document_id=demo_doc.id,
            test_code="HGB",
            value_raw="14.2",
            value_num=14.2,
            unit="g/dL",
            ref_low=12.0,
            ref_high=16.0,
            status="unverified",
            confidence=0.98,
            low_confidence=False,
            observed_on=now.strftime("%Y-%m-%d"),
            lab_name="Popular Diagnostic Centre",
            is_sample=True
        ),
        Observation(
            patient_id=patient1.id,
            document_id=demo_doc.id,
            test_code="WBC",
            value_raw="7.5",
            value_num=7.5,
            unit="10^9/L",
            ref_low=4.0,
            ref_high=11.0,
            status="unverified",
            confidence=0.96,
            low_confidence=False,
            observed_on=now.strftime("%Y-%m-%d"),
            lab_name="Popular Diagnostic Centre",
            is_sample=True
        ),
        Observation(
            patient_id=patient1.id,
            document_id=demo_doc.id,
            test_code="PLT",
            value_raw="250",
            value_num=250.0,
            unit="10^9/L",
            ref_low=150.0,
            ref_high=450.0,
            status="unverified",
            confidence=0.97,
            low_confidence=False,
            observed_on=now.strftime("%Y-%m-%d"),
            lab_name="Popular Diagnostic Centre",
            is_sample=True
        ),
        Observation(
            patient_id=patient1.id,
            document_id=demo_doc.id,
            test_code="GLU",
            value_raw="96.0",
            value_num=96.0,
            unit="mg/dL",
            ref_low=70.0,
            ref_high=100.0,
            status="doctor_verified",
            verified_by=doctor1.id,
            verified_at=now - timedelta(hours=2),
            confidence=0.99,
            low_confidence=False,
            observed_on=now.strftime("%Y-%m-%d"),
            lab_name="Popular Diagnostic Centre",
            is_sample=True
        ),
    ]

    for o in obs_list:
        db.add(o)

    db.commit()
    print("Pre-seeded 4 observations (3 unverified, 1 verified) for patient1.")
    print("Database seeding completed successfully!")


if __name__ == "__main__":
    seed()
