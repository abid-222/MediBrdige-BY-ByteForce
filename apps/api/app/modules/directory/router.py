import time
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import STALE_AFTER_DAYS
from app.core.db import get_db
from app.core.errors import AppError
from app.models import DirectoryReport, DoctorFacility, DoctorProfile, Facility, FacilityService, Specialty
from app.modules.directory.service import doctor_view, facility_view, is_stale, badge

router = APIRouter(prefix="/directory", tags=["directory"])

_DOCTORS_CACHE: dict = {"ts": 0.0, "items": []}
_FACILITIES_CACHE: dict = {"ts": 0.0, "items": []}
CACHE_TTL = 60.0  # In-memory fast cache


def _get_all_doctors_bulk(db: Session) -> list[dict]:
    now = time.time()
    if _DOCTORS_CACHE["items"] and (now - _DOCTORS_CACHE["ts"]) < CACHE_TTL:
        return _DOCTORS_CACHE["items"]

    docs = db.scalars(select(DoctorProfile).order_by(DoctorProfile.full_name)).all()
    specialties = {s.id: s for s in db.scalars(select(Specialty)).all()}
    chamber_rows = db.execute(
        select(DoctorFacility, Facility).join(Facility, Facility.id == DoctorFacility.facility_id)
    ).all()

    chambers_by_doc: dict[str, list] = {}
    facility_types_by_doc: dict[str, set] = {}

    for df, f in chamber_rows:
        chambers_by_doc.setdefault(df.doctor_id, []).append({
            "facility_id": f.id,
            "facility_name": f.name,
            "facility_type": f.type,
            "district": f.district,
            "chamber": df.chamber,
            "schedule": df.schedule,
            "fee_bdt": df.fee_bdt,
            "fee_state": "confirmed" if df.fee_bdt is not None else "not_confirmed",
            "fee_label": f"BDT {df.fee_bdt}" if df.fee_bdt is not None else "Not confirmed",
            "fee_confirmed_at": df.fee_confirmed_at,
        })
        facility_types_by_doc.setdefault(df.doctor_id, set()).add(f.type)

    all_items = []
    for d in docs:
        spec = specialties.get(d.specialty_id)
        chambers = chambers_by_doc.get(d.user_id, [])
        all_items.append({
            "id": d.user_id,
            "user_id": d.user_id,
            "full_name": d.full_name,
            "specialty": spec.name_en if spec else None,
            "specialty_code": spec.code if spec else None,
            "qualifications": d.qualifications,
            "experience_years": d.experience_years,
            "verification": badge(d.verification),
            "last_verified_at": d.last_verified_at,
            "stale": is_stale(d.last_verified_at),
            "is_sample": d.is_sample,
            "chambers": chambers,
            "_facility_types": list(facility_types_by_doc.get(d.user_id, set())),
        })

    _DOCTORS_CACHE["items"] = all_items
    _DOCTORS_CACHE["ts"] = now
    return all_items


def _get_all_facilities_bulk(db: Session) -> list[dict]:
    now = time.time()
    if _FACILITIES_CACHE["items"] and (now - _FACILITIES_CACHE["ts"]) < CACHE_TTL:
        return _FACILITIES_CACHE["items"]

    rows = db.scalars(select(Facility).order_by(Facility.name)).all()
    doctor_rows = db.execute(
        select(DoctorFacility, DoctorProfile).join(DoctorProfile, DoctorProfile.user_id == DoctorFacility.doctor_id)
    ).all()
    specialties = {s.id: s for s in db.scalars(select(Specialty)).all()}

    # Query facility services safely
    service_rows = db.scalars(select(FacilityService)).all()
    services_by_facility: dict[str, list] = {}
    for fs in service_rows:
        if fs.available is not False:
            services_by_facility.setdefault(fs.facility_id, []).append(fs.service_code)

    docs_by_facility: dict[str, list] = {}
    for df, dp in doctor_rows:
        spec = specialties.get(dp.specialty_id)
        docs_by_facility.setdefault(df.facility_id, []).append({
            "doctor_id": dp.user_id,
            "id": dp.user_id,
            "full_name": dp.full_name,
            "specialty": spec.name_en if spec else "General Medicine",
            "qualifications": dp.qualifications,
            "chamber": df.chamber,
            "schedule": df.schedule,
            "fee_bdt": df.fee_bdt,
            "fee_label": f"BDT {df.fee_bdt}" if df.fee_bdt else "Confirmed Fee",
            "verification": badge(dp.verification),
        })

    all_facs = []
    for f in rows:
        aff = docs_by_facility.get(f.id, [])
        all_facs.append({
            "id": f.id,
            "name": f.name,
            "type": f.type,
            "district": f.district,
            "address": f.address,
            "phone": f.phone,
            "has_emergency": f.has_emergency,
            "services": services_by_facility.get(f.id, []),
            "verification": badge(f.verification),
            "last_verified_at": f.last_verified_at,
            "stale": is_stale(f.last_verified_at),
            "is_sample": f.is_sample,
            "doctor_count": len(aff),
            "doctors": aff,
        })

    _FACILITIES_CACHE["items"] = all_facs
    _FACILITIES_CACHE["ts"] = now
    return all_facs


@router.get("/meta")
def meta(db: Session = Depends(get_db)):
    sp = db.scalars(select(Specialty).order_by(Specialty.name_en)).all()
    return {"stale_after_days": STALE_AFTER_DAYS, "specialties": [{"code": s.code, "name_en": s.name_en, "name_bn": s.name_bn} for s in sp],
            "supported_geography": ["Dhaka"], "sample_notice": "Sample data. Listing is not an endorsement."}


@router.get("/doctors")
def doctors(db: Session = Depends(get_db), specialty: str | None = None, district: str | None = None,
            facility_type: str | None = None, fee_min: int | None = None, fee_max: int | None = None,
            verified_only: bool = False, q: str | None = None, page: int = 1, page_size: int = 100):
    page_size = min(page_size, 200)
    all_docs = _get_all_doctors_bulk(db)
    items = []
    for v in all_docs:
        if specialty and v["specialty_code"] != specialty:
            continue
        if verified_only and v["verification"] != "verified":
            continue
        if q:
            q_lower = q.lower()
            name_match = q_lower in v["full_name"].lower()
            spec_match = v["specialty"] and q_lower in v["specialty"].lower()
            chamber_match = any(q_lower in (c.get("facility_name") or "").lower() for c in v["chambers"])
            if not (name_match or spec_match or chamber_match):
                continue
        ch = v["chambers"]
        if district and not any((c.get("district") or "").lower() == district.lower() for c in ch):
            continue
        if facility_type and facility_type not in v.get("_facility_types", []):
            continue
        if fee_min is not None or fee_max is not None:
            fees = [c["fee_bdt"] for c in ch if c.get("fee_bdt") is not None]
            if not any((fee_min is None or f >= fee_min) and (fee_max is None or f <= fee_max) for f in fees):
                continue
        items.append(v)
    start = (page - 1) * page_size
    return {"items": items[start:start + page_size], "total": len(items), "page": page}


@router.get("/doctors/{doctor_id}")
def doctor_detail(doctor_id: str, db: Session = Depends(get_db)):
    d = db.get(DoctorProfile, doctor_id)
    if not d:
        raise AppError(404, "not_found", "Doctor not found")
    return doctor_view(db, d, detail=True)


@router.get("/facilities")
def facilities(db: Session = Depends(get_db), district: str | None = None, facility_type: str | None = None,
               verified_only: bool = False, page: int = 1, page_size: int = 20):
    page_size = min(page_size, 50)
    all_facs = _get_all_facilities_bulk(db)
    items = []
    for v in all_facs:
        if district and v["district"].lower() != district.lower():
            continue
        if facility_type and v["type"] != facility_type:
            continue
        if verified_only and v["verification"] != "verified":
            continue
        items.append(v)
    start = (page - 1) * page_size
    return {"items": items[start:start + page_size], "total": len(items), "page": page}


@router.get("/facilities/{facility_id}")
def facility_detail(facility_id: str, db: Session = Depends(get_db)):
    f = db.get(Facility, facility_id)
    if not f:
        raise AppError(404, "not_found", "Facility not found")
    return facility_view(db, f, detail=True)


class ReportIn(BaseModel):
    entity_type: str
    entity_id: str
    field: str | None = None
    message: str


_recent: dict[str, list[float]] = {}


@router.post("/reports")
def report(body: ReportIn, db: Session = Depends(get_db)):
    if body.entity_type not in ("doctor", "facility") or len(body.message.strip()) < 5:
        raise AppError(400, "invalid_report", "Describe the incorrect information")
    r = DirectoryReport(entity_type=body.entity_type, entity_id=body.entity_id, field=body.field, message=body.message)
    db.add(r)
    db.commit()
    return {"id": r.id, "status": "open"}
