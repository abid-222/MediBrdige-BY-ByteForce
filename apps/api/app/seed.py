"""Seed: reference data always; demo data on request. Everything demo is SYNTHETIC and labelled is_sample=True."""
import csv, json, os
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models import (AvailabilitySlot, Document, DoctorFacility, DoctorProfile, Facility, FacilityService, FacilityStaff,
                        FieldSource, KnowledgeChunk, KnowledgeSource, ModelRegistry, PatientProfile, Profile, Specialty,
                        FeatureFlag, SystemSetting)
from app.modules.documents import service as docsvc

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DEMO_PASSWORD = "Demo@12345"

KNOWLEDGE = [
    ("HGB", "Hemoglobin is a protein in red blood cells that carries oxygen. Reference ranges differ by lab, age and sex, so compare your value with the range printed on your own report."),
    ("HGB", "A single hemoglobin value cannot explain why it is high or low. A doctor looks at the full picture, symptoms and other tests."),
    ("WBC", "White blood cells (WBC) are part of the immune system. The count can change for many reasons and one value does not identify a cause."),
    ("RBC", "The RBC count is the number of red blood cells in a volume of blood. It is read together with hemoglobin and hematocrit."),
    ("PLT", "Platelets help blood clot. The platelet count is interpreted by a doctor together with symptoms and other results."),
    ("HCT", "Hematocrit (PCV) is the percentage of blood volume made of red cells. It is usually read with hemoglobin."),
    ("MCV", "MCV describes the average size of red blood cells, reported in femtolitres (fL)."),
    ("GLU", "Blood glucose is the amount of sugar in the blood. Fasting and random readings have different reference ranges; check which one your report states."),
    ("GLU", "Glucose can be reported in mg/dL or mmol/L. The same number in different units is not the same value, so always check the unit."),
]
SPECIALTIES = json.load(open(os.path.join(ROOT, "data", "specialties.json"), encoding="utf-8")) if os.path.exists(os.path.join(ROOT, "data", "specialties.json")) else []


def seed_reference(db: Session):
    docsvc.seed_catalog(db)
    for s in SPECIALTIES:
        if not db.scalar(select(Specialty).where(Specialty.code == s["code"])):
            db.add(Specialty(**s))
    if not db.scalar(select(KnowledgeSource)):
        src = KnowledgeSource(title="MediBridge curated lab explainers (synthetic prototype set)", publisher="MediBridge demo",
                              approved_at=datetime.now(timezone.utc))
        db.add(src)
        db.flush()
        for code, text in KNOWLEDGE:
            db.add(KnowledgeChunk(source_id=src.id, source_title=src.title, source_date="2026-11-05", content=text, test_code=code))
    for flag, on in (("directory_dhaka_only", True), ("report_types_cbc_glucose_only", True), ("ml_classifier", False)):
        if not db.get(FeatureFlag, flag):
            db.add(FeatureFlag(flag=flag, enabled=on))
    if not db.get(SystemSetting, "crisis_message"):
        db.add(SystemSetting(key="crisis_message", value={"en": "Call 999 now.", "bn": "এখনই ৯৯৯-এ কল করুন।"}))
    mpath = os.path.join(ROOT, "apps", "api", "ml", "metrics.json")
    if os.path.exists(mpath) and not db.scalar(select(ModelRegistry)):
        db.add(ModelRegistry(model_name="document-type-classifier", version="0.1.0", dataset_version="synthetic-v1",
                             metrics=json.load(open(mpath)), approval_status="research_prototype",
                             intended_use="Route uploaded documents in the hackathon demo.",
                             limitations="Template-generated synthetic data; scores are not clinical validation.",
                             deployed_at=datetime.now(timezone.utc)))
    db.commit()


def _user(db, email, role, name=None, facility_id=None, status="active"):
    p = db.scalar(select(Profile).where(Profile.email == email))
    if p:
        return p
    p = Profile(email=email, password_hash=hash_password(DEMO_PASSWORD), role=role, status=status,
                email_verified_at=datetime.now(timezone.utc), facility_id=facility_id)
    db.add(p)
    db.flush()
    if role == "patient":
        db.add(PatientProfile(user_id=p.id, full_name=name or email, language="en", onboarding_completed=True,
                              division="Dhaka", district="Dhaka", is_sample=True))
    db.commit()
    return p


def seed_directory(db: Session):
    path = os.path.join(ROOT, "data", "directory_seed.csv")
    if not os.path.exists(path) or db.scalar(select(DoctorProfile)):
        return
    facs, now = {}, datetime.now(timezone.utc)
    specs = {s.code: s.id for s in db.scalars(select(Specialty)).all()}
    for n, r in enumerate(csv.DictReader(open(path, encoding="utf-8")), 1):
        fname = r["facility_name"]
        if fname not in facs:
            f = Facility(name=fname, type=r["facility_type"], district="Dhaka", has_emergency=bool(int(r["has_emergency"])),
                         verification="verified", last_verified_at=now - timedelta(days=20), is_sample=True)
            db.add(f); db.flush(); facs[fname] = f
            db.add(FieldSource(entity_type="facility", entity_id=f.id, field_name="has_emergency", source_name=r["source_name"],
                               collected_at=now, verified_at=now - timedelta(days=20), confidence="medium"))
        f = facs[fname]
        email = f"doc{n}@sample.medibridge.dev"
        u = Profile(email=email, password_hash=hash_password(DEMO_PASSWORD), role="doctor", status="active",
                    email_verified_at=now)
        db.add(u); db.flush()
        lv = now - timedelta(days=int(r["verified_days_ago"])) if r["verified_days_ago"] else None
        d = DoctorProfile(user_id=u.id, full_name=r["full_name"], specialty_id=specs.get(r["specialty_code"]),
                          experience_years=int(r["experience_years"]), verification=r["verification"],
                          last_verified_at=lv, is_sample=True, qualifications=["MBBS"])
        db.add(d)
        fee = int(r["fee_bdt"]) if r["fee_bdt"] else None
        db.add(DoctorFacility(doctor_id=u.id, facility_id=f.id, chamber=f"{fname} OPD", fee_bdt=fee,
                              fee_confirmed_at=(now - timedelta(days=15)) if fee else None, schedule={"days": ["Sun", "Tue", "Thu"]}))
        db.add(FacilityService(facility_id=f.id, service_code=r["specialty_code"], available=True, last_confirmed_at=now - timedelta(days=30)))
        db.add(FieldSource(entity_type="doctor", entity_id=u.id, field_name="fee_bdt", source_name=r["source_name"],
                           collected_at=now, verified_at=lv, confidence="medium" if lv else "low"))
        for k in (1, 2, 3):
            s = (now + timedelta(days=k)).replace(hour=10, minute=0, second=0, microsecond=0)
            db.add(AvailabilitySlot(doctor_id=u.id, facility_id=f.id, start=s, end=s + timedelta(minutes=20)))
    db.commit()


SAMPLE_CBC = """Laboratory: Sample Diagnostic Lab (SYNTHETIC)
Date: {date}
Complete Blood Count (CBC)
Hemoglobin {hb} g/dL 12.0 - 16.0
WBC {wbc} 10^9/L 4.0 - 11.0
Platelet {plt} 10^9/L 150 - 450
"""
SAMPLE_GLU = """Laboratory: Sample Diagnostic Lab (SYNTHETIC)
Date: {date}
Blood Glucose (Fasting)
Glucose {v} {u} 70 - 100
"""
BLURRED_CBC = """Laboratory: Sample Diagnostic Lab (SYNTHETIC, poor scan)
Date: 2026-10-20
Complete Blood Count (CBC)
Hemoglobin 1O.5 g/dL 12.0 - 16.0
WBC 6.2 4.0 - 11.0
Platelet 2900 10^9/L 150 - 450
"""


def make_pdf(text: str, path: str):
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 60), text, fontsize=11)
    doc.save(path)


def seed_demo(db: Session, upload_dir: str):
    seed_reference(db)
    seed_directory(db)
    os.makedirs(upload_dir, exist_ok=True)
    f = db.scalars(select(Facility)).first()
    _user(db, "admin@demo.medibridge.dev", "super_admin", "Super Admin")
    _user(db, "reviewer@demo.medibridge.dev", "reviewer", "Reviewer")
    if f:
        _user(db, "hospital@demo.medibridge.dev", "facility_admin", "Hospital Admin", facility_id=f.id)
    docs = db.scalars(select(DoctorProfile).where(DoctorProfile.verification == "verified")).all()[:4]
    for i, d in enumerate(docs, 1):  # give four verified doctors memorable demo logins
        u = db.get(Profile, d.user_id)
        u.email = f"doctor{i}@demo.medibridge.dev"
    db.commit()
    names = ["Demo Patient One", "Demo Patient Two", "Demo Patient Three", "Demo Patient Four", "Demo Patient Five"]
    patients = [_user(db, f"patient{i}@demo.medibridge.dev", "patient", n) for i, n in enumerate(names, 1)]
    p1 = patients[0]
    if not db.scalar(select(Document).where(Document.patient_id == p1.id)):
        samples = [("cbc_old.pdf", SAMPLE_CBC.format(date="2026-06-12", hb="11.8", wbc="7.1", plt="260")),
                   ("cbc_new.pdf", SAMPLE_CBC.format(date="2026-10-02", hb="12.6", wbc="6.8", plt="255")),
                   ("glucose.pdf", SAMPLE_GLU.format(date="2026-10-02", v="98", u="mg/dL")),
                   ("cbc_blurred.pdf", BLURRED_CBC)]
        for name, text in samples:
            path = os.path.join(upload_dir, f"demo_{name}")
            make_pdf(text, path)
            doc = Document(patient_id=p1.id, uploaded_by=p1.id, file_ref=path, mime="application/pdf", is_sample=True)
            db.add(doc); db.commit()
            docsvc.run_pipeline(db, doc)
    return {"password": DEMO_PASSWORD}


if __name__ == "__main__":
    # `python -m app.seed reference`  -> catalog/specialties/knowledge only (safe for production, no demo users)
    import sys
    from app.core.db import SessionLocal
    db = SessionLocal()
    if len(sys.argv) > 1 and sys.argv[1] == "reference":
        seed_reference(db); print("reference data seeded")
    else:
        print("usage: python -m app.seed reference   (demo data: scripts/seed.py, dev only)")
