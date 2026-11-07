import hashlib
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import require_role
from app.models import PatientPreference, PatientProfile, Profile, TriageSession
from app.modules.navigator import service

router = APIRouter(prefix="/navigator", tags=["navigator"])
SPECIALTY_CODES = set(service.SPECIALTY_MAP)


class TriageIn(BaseModel):
    text: str
    lang: str = "en"
    extra_red_flags: list[str] = []   # answers to the red-flag question step (codes)


class MatchIn(TriageIn):
    district: str | None = "Dhaka"
    budget: str | None = None
    care_pref: list[str] = []
    budget_first: bool = False
    specialties: list[str] | None = None


@router.post("/triage")
def triage(body: TriageIn, db: Session = Depends(get_db)):
    res = service.triage(body.text + " " + " ".join(body.extra_red_flags), body.lang)
    db.add(TriageSession(input_hash=hashlib.sha256(body.text.encode()).hexdigest(), raw_text=body.text, result_json=res))
    db.commit()
    return res


@router.post("/matches")
def matches(body: MatchIn, user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    tri = service.triage(body.text + " " + " ".join(body.extra_red_flags), body.lang)
    if tri["emergency"]:   # G3: emergency always wins; budget and ranking are never evaluated
        return {"emergency": True, "guidance": tri["guidance"], "red_flags": tri["red_flags"], "eligible": [],
                "needs_review": [], "excluded_count": 0, "emergency_number": "999"}
    specs = [s for s in (body.specialties or tri["suggested_specialties"]) if s in SPECIALTY_CODES]
    if not specs:
        raise AppError(400, "invalid_specialty", "Choose from the allowed specialties")
    pref = db.get(PatientPreference, user.id)
    budget = body.budget or (pref.budget if pref else None)
    care = body.care_pref or (pref.care_pref if pref else [])
    res = service.match(db, specs, budget=budget, care_pref=care, district=body.district, budget_first=body.budget_first)
    return {"emergency": False, "suggested_specialties": specs, **res,
            "disclaimer": "Suggestions are not a diagnosis. Listings are sample data and not an endorsement."}
