from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import STALE_AFTER_DAYS
from app.core.db import get_db
from app.core.errors import AppError
from app.models import DirectoryReport, DoctorFacility, DoctorProfile, Facility, Specialty
from app.modules.directory.service import doctor_view, facility_view

router = APIRouter(prefix="/directory", tags=["directory"])


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
    docs = db.scalars(select(DoctorProfile).order_by(DoctorProfile.full_name)).all()
    items = []
    for d in docs:
        v = doctor_view(db, d)
        if specialty and v["specialty_code"] != specialty:
            continue
        if verified_only and v["verification"] != "verified":
            continue
        if q and q.lower() not in d.full_name.lower():
            continue
        ch = v["chambers"]
        if district and not any(c["district"].lower() == district.lower() for c in ch):
            continue
        if facility_type:
            ftypes = {f.type for f in db.scalars(select(Facility).where(Facility.id.in_([c["facility_id"] for c in ch]))).all()}
            if facility_type not in ftypes:
                continue
        if fee_min is not None or fee_max is not None:
            fees = [c["fee_bdt"] for c in ch if c["fee_bdt"] is not None]  # unknown fees never match a range
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
    rows = db.scalars(select(Facility).order_by(Facility.name)).all()
    items = []
    for f in rows:
        if district and f.district.lower() != district.lower():
            continue
        if facility_type and f.type != facility_type:
            continue
        v = facility_view(db, f)
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
