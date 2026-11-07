from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core import audit
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import hash_password, require_role
from app.models import (Appointment, DoctorFacility, DoctorProfile, Facility, FacilityPrice, FacilityService,
                        FacilityStaff, Profile)

router = APIRouter(prefix="/facility", tags=["facility"])
ADMIN = require_role("facility_admin")
ANY_STAFF = require_role("facility_admin", "facility_staff")


def fid(user: Profile) -> str:
    """Every facility query is scoped by the caller's own facility_id. It is never taken from the request."""
    if not user.facility_id:
        raise AppError(403, "no_facility", "Account is not linked to a facility")
    return user.facility_id


class ProfileIn(BaseModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    has_emergency: bool | None = None


class ServiceIn(BaseModel):
    service_code: str
    available: bool | None = None


class PriceIn(BaseModel):
    item_code: str
    price_bdt: int | None = None
    source: str


class ScheduleIn(BaseModel):
    doctor_id: str
    chamber: str | None = None
    schedule: dict = {}
    fee_bdt: int | None = None


class StaffIn(BaseModel):
    email: str
    password: str
    staff_role: str  # receptionist | report_desk


@router.get("/dashboard")
def dashboard(user: Profile = Depends(ANY_STAFF), db: Session = Depends(get_db)):
    f = db.get(Facility, fid(user))
    appts = db.scalars(select(Appointment).where(Appointment.facility_id == f.id)).all()
    roster = db.scalars(select(DoctorFacility).where(DoctorFacility.facility_id == f.id)).all()
    return {"facility": {"id": f.id, "name": f.name, "verification": f.verification},
            "roster": [{"doctor_id": r.doctor_id, "name": (db.get(DoctorProfile, r.doctor_id) or None) and db.get(DoctorProfile, r.doctor_id).full_name,
                        "fee_bdt": r.fee_bdt, "chamber": r.chamber} for r in roster],
            "appointments": {"total": len(appts), "requested": sum(a.status == "requested" for a in appts)}}


@router.put("/profile")
def update_profile(body: ProfileIn, user: Profile = Depends(ADMIN), db: Session = Depends(get_db)):
    f = db.get(Facility, fid(user))
    before = {"name": f.name, "phone": f.phone, "has_emergency": f.has_emergency}
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(f, k, v)
    db.commit()
    audit.log(db, user, "facility.profile.update", resource_type="facility", resource_id=f.id, before=before,
              after=body.model_dump(exclude_unset=True))
    return {"id": f.id, "name": f.name}


@router.get("/services")
def list_services(user: Profile = Depends(ANY_STAFF), db: Session = Depends(get_db)):
    rows = db.scalars(select(FacilityService).where(FacilityService.facility_id == fid(user))).all()
    return {"items": [{"id": s.id, "service_code": s.service_code, "available": s.available,
                       "last_confirmed_at": s.last_confirmed_at} for s in rows]}


@router.post("/services")
def add_service(body: ServiceIn, user: Profile = Depends(ADMIN), db: Session = Depends(get_db)):
    s = FacilityService(facility_id=fid(user), service_code=body.service_code, available=body.available,
                        last_confirmed_at=datetime.now(timezone.utc))
    db.add(s)
    db.commit()
    return {"id": s.id}


@router.put("/services/{sid}")
def update_service(sid: str, body: ServiceIn, user: Profile = Depends(ADMIN), db: Session = Depends(get_db)):
    s = db.get(FacilityService, sid)
    if not s or s.facility_id != fid(user):
        raise AppError(404, "not_found", "Service not found")
    s.available, s.last_confirmed_at = body.available, datetime.now(timezone.utc)
    db.commit()
    return {"id": s.id}


@router.delete("/services/{sid}")
def delete_service(sid: str, user: Profile = Depends(ADMIN), db: Session = Depends(get_db)):
    s = db.get(FacilityService, sid)
    if not s or s.facility_id != fid(user):
        raise AppError(404, "not_found", "Service not found")
    db.delete(s)
    db.commit()
    return {"deleted": True}


@router.get("/prices")
def list_prices(user: Profile = Depends(ANY_STAFF), db: Session = Depends(get_db)):
    rows = db.scalars(select(FacilityPrice).where(FacilityPrice.facility_id == fid(user))).all()
    return {"items": [{"id": p.id, "item_code": p.item_code, "price_bdt": p.price_bdt,
                       "confirmed_at": p.confirmed_at, "source": p.source} for p in rows]}


@router.post("/prices")
def set_price(body: PriceIn, user: Profile = Depends(ADMIN), db: Session = Depends(get_db)):
    if not body.source.strip():
        raise AppError(400, "source_required", "A source is required for every price change")
    p = db.scalar(select(FacilityPrice).where(FacilityPrice.facility_id == fid(user), FacilityPrice.item_code == body.item_code))
    before = None if not p else {"price_bdt": p.price_bdt}
    p = p or FacilityPrice(facility_id=fid(user), item_code=body.item_code)
    p.price_bdt, p.source, p.confirmed_at = body.price_bdt, body.source, datetime.now(timezone.utc)   # stamped on every change
    db.add(p)
    db.commit()
    audit.log(db, user, "facility.price.set", resource_type="facility_price", resource_id=p.id, before=before,
              after={"price_bdt": p.price_bdt, "source": p.source})
    return {"id": p.id, "confirmed_at": p.confirmed_at}


@router.put("/schedules")
def set_schedule(body: ScheduleIn, user: Profile = Depends(ADMIN), db: Session = Depends(get_db)):
    df = db.get(DoctorFacility, (body.doctor_id, fid(user)))
    if not df:
        raise AppError(404, "not_found", "Doctor is not on this facility's roster")
    df.chamber, df.schedule = body.chamber, body.schedule
    if body.fee_bdt is not None:
        df.fee_bdt, df.fee_confirmed_at = body.fee_bdt, datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.post("/staff")
def add_staff(body: StaffIn, user: Profile = Depends(ADMIN), db: Session = Depends(get_db)):
    if body.staff_role not in ("receptionist", "report_desk"):
        raise AppError(400, "invalid_staff_role", "Choose receptionist or report_desk")
    if db.scalar(select(Profile).where(Profile.email == body.email.lower())):
        raise AppError(409, "email_in_use", "Email already registered")
    p = Profile(email=body.email.lower(), password_hash=hash_password(body.password), role="facility_staff",
                status="active", facility_id=fid(user), email_verified_at=datetime.now(timezone.utc))
    db.add(p)
    db.flush()
    db.add(FacilityStaff(facility_id=fid(user), user_id=p.id, staff_role=body.staff_role))
    db.commit()
    return {"id": p.id, "staff_role": body.staff_role}
