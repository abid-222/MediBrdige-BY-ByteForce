import os, tempfile
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_tmp}/test.db"   # TEST_DATABASE_URL=postgresql+psycopg://... runs the suite on Postgres
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["APP_ENV"] = "dev"
os.environ["ANTHROPIC_API_KEY"] = ""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.core.db import Base, SessionLocal, engine
from app.core.security import hash_password, make_token
from app.main import app
from app.models import *  # noqa
from app.seed import seed_reference

NOW = datetime.now(timezone.utc)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()
    seed_reference(db)
    db.close()
    yield


@pytest.fixture
def db():
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture
def client():
    return TestClient(app)


class Factory:
    def __init__(self, db):
        self.db = db

    def user(self, email, role="patient", status="active", facility_id=None, name=None):
        p = Profile(email=email, password_hash=hash_password("Passw0rd!"), role=role, status=status,
                    email_verified_at=NOW, facility_id=facility_id)
        self.db.add(p); self.db.flush()
        if role == "patient":
            self.db.add(PatientProfile(user_id=p.id, full_name=name or email, onboarding_completed=True))
        self.db.commit()
        return p

    def doctor(self, email, specialty="general_medicine", verification="verified", fee=800, facility=None, verified_days_ago=10, name=None):
        u = self.user(email, "doctor")
        spec = self.db.scalar(select_spec(specialty))
        self.db.add(DoctorProfile(user_id=u.id, full_name=name or f"Dr {email}", specialty_id=spec.id, verification=verification,
                                  last_verified_at=NOW - timedelta(days=verified_days_ago) if verified_days_ago is not None else None,
                                  experience_years=10, is_sample=True))
        f = facility or self.facility()
        self.db.add(DoctorFacility(doctor_id=u.id, facility_id=f.id, fee_bdt=fee))
        if not self.db.scalar(select_svc(f.id, specialty)):
            self.db.add(FacilityService(facility_id=f.id, service_code=specialty, available=True))
        self.db.commit()
        return u

    def facility(self, name="Sample Hospital", emergency=True, verification="verified"):
        f = Facility(name=name, type="private", district="Dhaka", has_emergency=emergency, verification=verification,
                     last_verified_at=NOW - timedelta(days=5), is_sample=True)
        self.db.add(f); self.db.commit()
        return f

    def link(self, patient, doctor, share=True, resources=None, days=30):
        self.db.add(CareRelationship(patient_id=patient.id, doctor_id=doctor.id, origin="appointment"))
        if share:
            self.db.add(Consent(patient_id=patient.id, consent_type="doctor_share", grantee_id=doctor.id,
                                scope={"resources": resources or ["profile", "documents", "observations", "notes"]},
                                expires_at=NOW + timedelta(days=days)))
        self.db.commit()


def select_spec(code):
    from sqlalchemy import select
    return select(Specialty).where(Specialty.code == code)


def select_svc(fid, code):
    from sqlalchemy import select
    return select(FacilityService).where(FacilityService.facility_id == fid, FacilityService.service_code == code)


@pytest.fixture
def make(db):
    return Factory(db)


def auth(user):
    return {"Authorization": f"Bearer {make_token(user.id, user.token_version or 0)}"}
