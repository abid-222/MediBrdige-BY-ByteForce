from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import STALE_AFTER_DAYS
from app.models import (DoctorFacility, DoctorProfile, Facility, FacilityService, FieldSource, Specialty)


def _aware(dt):
    return dt if dt is None or dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_stale(last_verified_at) -> bool:
    lv = _aware(last_verified_at)
    return lv is None or (datetime.now(timezone.utc) - lv) > timedelta(days=STALE_AFTER_DAYS)


def badge(verification: str) -> str:
    """'Verified' only when verification == 'verified'. Everything else is never shown as verified."""
    return "verified" if verification == "verified" else ("pending" if verification in ("pending", "needs_evidence") else "unverified")


def provenance(db: Session, entity_type: str, entity_id: str):
    rows = db.scalars(select(FieldSource).where(FieldSource.entity_type == entity_type,
                                                FieldSource.entity_id == entity_id)).all()
    return [{"field": r.field_name, "source_name": r.source_name, "source_url": r.source_url,
             "collected_at": r.collected_at, "verified_at": r.verified_at, "confidence": r.confidence} for r in rows]


def doctor_view(db: Session, d: DoctorProfile, detail: bool = False):
    spec = db.get(Specialty, d.specialty_id) if d.specialty_id else None
    links = db.execute(select(DoctorFacility, Facility).join(Facility, Facility.id == DoctorFacility.facility_id)
                       .where(DoctorFacility.doctor_id == d.user_id)).all()
    chambers = []
    for df, f in links:
        chambers.append({"facility_id": f.id, "facility_name": f.name, "facility_type": f.type, "district": f.district, "chamber": df.chamber,
                         "schedule": df.schedule,
                         "fee_bdt": df.fee_bdt,
                         "fee_state": "confirmed" if df.fee_bdt is not None else "not_confirmed",
                         "fee_label": f"BDT {df.fee_bdt}" if df.fee_bdt is not None else "Not confirmed",
                         "fee_confirmed_at": df.fee_confirmed_at})
    out = {"id": d.user_id, "user_id": d.user_id, "full_name": d.full_name, "specialty": spec.name_en if spec else None,
           "specialty_code": spec.code if spec else None, "qualifications": d.qualifications,
           "experience_years": d.experience_years, "verification": badge(d.verification),
           "last_verified_at": d.last_verified_at, "stale": is_stale(d.last_verified_at),
           "is_sample": d.is_sample, "chambers": chambers}
    if detail:
        out["bio"] = d.bio
        out["provenance"] = provenance(db, "doctor", d.user_id)
        # bmdc_number is intentionally not public until verified by admin evidence review
        out["bmdc_number"] = d.bmdc_number if d.verification == "verified" else None
    return out


def facility_view(db: Session, f: Facility, detail: bool = False):
    links = db.execute(select(DoctorFacility, DoctorProfile)
                       .join(DoctorProfile, DoctorProfile.user_id == DoctorFacility.doctor_id)
                       .where(DoctorFacility.facility_id == f.id)).all()
    affiliated_doctors = []
    for df, dp in links:
        spec = db.get(Specialty, dp.specialty_id) if dp.specialty_id else None
        affiliated_doctors.append({
            "doctor_id": dp.user_id,
            "id": dp.user_id,
            "full_name": dp.full_name,
            "specialty": spec.name_en if spec else "General Medicine",
            "qualifications": dp.qualifications,
            "chamber": df.chamber,
            "fee_bdt": df.fee_bdt,
            "fee_label": f"BDT {df.fee_bdt}" if df.fee_bdt else "Confirmed Fee",
            "verification": badge(dp.verification),
        })

    out = {"id": f.id, "name": f.name, "type": f.type, "district": f.district, "address": f.address,
           "phone": f.phone, "has_emergency": f.has_emergency, "verification": badge(f.verification),
           "last_verified_at": f.last_verified_at, "stale": is_stale(f.last_verified_at), "is_sample": f.is_sample,
           "emergency_state": "confirmed" if f.has_emergency is not None else "not_confirmed",
           "doctor_count": len(affiliated_doctors),
           "doctors": affiliated_doctors}
    if detail:
        svc = db.scalars(select(FacilityService).where(FacilityService.facility_id == f.id)).all()
        out["services"] = [{"code": s.service_code, "available": s.available, "last_confirmed_at": s.last_confirmed_at}
                           for s in svc]
        out["provenance"] = provenance(db, "facility", f.id)
    return out
