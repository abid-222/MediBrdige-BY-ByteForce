from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core import audit
from app.core.access import require_access
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import get_current_user, require_role
from app.models import DoctorProfile, Observation, Profile, TestCatalog
from app.modules.patients.router import notify

router = APIRouter(tags=["observations"])


def _obs(o: Observation):
    return {"id": o.id, "test_code": o.test_code, "value": o.value_raw, "value_num": o.value_num, "unit": o.unit,
            "ref_low": o.ref_low, "ref_high": o.ref_high, "observed_on": o.observed_on, "lab_name": o.lab_name,
            "confidence": o.confidence, "low_confidence": o.low_confidence, "status": o.status,
            "doctor_verified": o.status == "doctor_verified", "document_id": o.document_id, "is_sample": o.is_sample}


@router.get("/patients/{patient_id}/observations")
def list_observations(patient_id: str, test_code: str | None = None, user: Profile = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if patient_id == "me":
        patient_id = user.id
    require_access(db, user, patient_id, "observations", "list")
    q = select(Observation).where(Observation.patient_id == patient_id).order_by(Observation.observed_on)
    if test_code:
        q = q.where(Observation.test_code == test_code)
    return {"items": [_obs(o) for o in db.scalars(q).all()]}


def _convert(cat: TestCatalog, value, unit, ref):
    """Convert into canonical unit. Returns None if the unit cannot be safely converted."""
    if value is None or not unit:
        return None
    mult = (cat.convertible_units or {}).get(unit.lower())
    if mult is None:
        return None
    return round(value * mult, 3), (None if ref is None else round(ref * mult, 3))


@router.get("/observations/trends")
def trends(test_code: str, patient_id: str | None = None, user: Profile = Depends(get_current_user),
           db: Session = Depends(get_db)):
    pid = patient_id if (patient_id and patient_id != "me") else user.id
    require_access(db, user, pid, "observations", "trend")
    cat = db.get(TestCatalog, test_code)
    if not cat:
        raise AppError(404, "unknown_test", "This test is not supported yet")
    rows = db.scalars(select(Observation).where(Observation.patient_id == pid, Observation.test_code == test_code)
                      .order_by(Observation.observed_on)).all()
    points, warnings = [], []
    for o in rows:
        v = _convert(cat, o.value_num, o.unit, o.value_num)
        if v is None:
            if o.value_num is None:
                warnings.append({"observation_id": o.id, "code": "value_unreadable",
                                 "message": "This value could not be read reliably; left off the chart until a doctor corrects it."})
            else:
                warnings.append({"observation_id": o.id, "code": "unit_incompatible",
                                 "message": f"Unit '{o.unit or 'missing'}' cannot be compared with {cat.canonical_unit}; left off the chart."})
            continue
        lo = _convert(cat, o.ref_low, o.unit, o.ref_low)
        hi = _convert(cat, o.ref_high, o.unit, o.ref_high)
        points.append({"observation_id": o.id, "date": o.observed_on, "value": v[0], "unit": cat.canonical_unit,
                       "original_value": o.value_raw, "original_unit": o.unit,
                       "ref_low": lo[0] if lo else None, "ref_high": hi[0] if hi else None,  # each point keeps its own lab range
                       "doctor_verified": o.status == "doctor_verified", "low_confidence": o.low_confidence,
                       "document_id": o.document_id})
    change = None
    if len(points) >= 2:
        a, b = points[-2], points[-1]
        change = {"from": a["value"], "to": b["value"], "unit": cat.canonical_unit,
                  "text_en": f"Value changed from {a['value']} to {b['value']} {cat.canonical_unit}",
                  "text_bn": f"মান {a['value']} থেকে {b['value']} {cat.canonical_unit} হয়েছে"}  # neutral wording only
    return {"test_code": test_code, "test_name": cat.name_en, "canonical_unit": cat.canonical_unit,
            "points": points, "warnings": warnings, "change": change}


@router.post("/observations/{obs_id}/verify")
def verify(obs_id: str, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    o = db.get(Observation, obs_id)
    if not o:
        raise AppError(404, "not_found", "Observation not found")
    dp = db.get(DoctorProfile, user.id)
    if not dp or dp.verification != "verified":
        raise AppError(403, "doctor_not_verified", "Only a verified doctor can verify values")
    require_access(db, user, o.patient_id, "observations", "verify", o.id)
    before = {"status": o.status}
    o.status = "doctor_verified"
    o.verified_by = user.id
    o.verified_at = datetime.now(timezone.utc)
    db.commit()
    notify(db, o.patient_id, "report_reviewed", {"observation_id": o.id, "test_code": o.test_code, "doctor_name": dp.full_name})
    audit.log(db, user, "observations.verify", resource_type="observation", resource_id=o.id,
              patient_id=o.patient_id, before=before, after={"status": o.status})
    return _obs(o)
