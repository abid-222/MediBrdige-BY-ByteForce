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

SPECIALTY_DISPLAY_NAMES = {
    "general_medicine": "General Medicine / Internal Medicine",
    "cardiology": "Cardiology (Heart & Circulation)",
    "endocrinology": "Endocrinology (Diabetes & Hormones)",
    "hematology": "Hematology (Blood Disorders)",
    "neurology": "Neurology (Brain & Nervous System)",
    "pediatrics": "Pediatrics (Child Healthcare)",
    "gynecology": "Gynecology & Obstetrics (Women's Health)",
    "orthopedics": "Orthopedics (Bones & Joints)",
    "dermatology": "Dermatology (Skin & Hair)",
    "ent": "ENT (Ear, Nose & Throat)",
    "gastroenterology": "Gastroenterology (Digestive Health)",
}


class TriageIn(BaseModel):
    text: str
    lang: str = "en"
    extra_red_flags: list[str] = []   # answers to the red-flag question step (codes)


class GuidanceIn(BaseModel):
    text: str
    lang: str = "en"
    history: list[dict] = []


class MatchIn(TriageIn):
    district: str | None = "Dhaka"
    budget: str | None = None
    care_pref: list[str] = []
    budget_first: bool = False
    specialties: list[str] | None = None


@router.post("/guidance")
def get_guidance(body: GuidanceIn, db: Session = Depends(get_db)):
    query = body.text.strip()
    if len(query) < 2:
        raise AppError(400, "invalid_query", "Query must be at least 2 characters long")

    # 1. Deterministic safety triage first
    tri = service.triage(query, body.lang)
    if tri["emergency"]:
        return {
            "emergency": True,
            "reply": tri["guidance"],
            "red_flags": tri["red_flags"],
            "emergency_number": tri.get("emergency_number", "999"),
            "suggested_specialties": [],
            "preparation_tips": [
                "Do not wait for a regular doctor appointment.",
                "Proceed directly to an emergency department or call 999.",
            ],
            "disclaimer": "EMERGENCY ALERT: Immediate physical emergency medical care is required.",
        }

    # 2. Extract suggested specialties
    specs = tri["suggested_specialties"]
    primary_spec = specs[0] if specs else "general_medicine"
    spec_label = SPECIALTY_DISPLAY_NAMES.get(primary_spec, primary_spec.replace("_", " ").title())

    # 3. Optional ML Model prediction
    ml_info = None
    try:
        from app.modules.ml.service import ml_service
        ml_res = ml_service.predict(query)
        ml_info = {
            "predicted_department": ml_res.get("prediction"),
            "confidence": ml_res.get("confidence"),
            "abstain": ml_res.get("abstain", False),
        }
    except Exception:
        ml_info = None

    # 4. Generate structured guidance response
    if body.lang == "bn":
        reply = (
            f"আপনার বর্ণিত লক্ষণের ভিত্তিতে প্রাথমিক মূল্যায়নে **{spec_label}** বিভাগের বিশেষজ্ঞ ডাক্তারের পরামর্শ নেওয়ার সুপারিশ করা হচ্ছে। "
            f"আপনার লক্ষণগুলো কতদিন ধরে চলছে এবং কোনো তীব্র অস্বস্তি বা দুর্বলতা আছে কিনা তা লক্ষ্য রাখুন।"
        )
        tips = [
            "লক্ষণগুলো ঠিক কবে শুরু হয়েছিল তা নোট করে রাখুন।",
            "পূর্ববর্তী টেস্ট রিপোর্ট বা প্রেসক্রিপশন থাকলে সাথে রাখুন।",
            "লক্ষণ তীব্র হলে অবহেলা না করে দ্রুত ডাক্তারের কাছে যান।"
        ]
        red_flags_to_watch = [
            "তীব্র শ্বাসকষ্ট বা বুকে চাপ",
            "উচ্চ জ্বর (>১০৩° ফারেনহাইট) যা ঔষধ সেবনেও কমে না",
            "হঠাৎ অচেতন বা অতিরিক্ত দুর্বল হয়ে পড়া"
        ]
        disclaimer = "মেডিব্রিজ এআই অ্যাসিস্ট্যান্টের এই তথ্যটি শুধুমাত্র প্রাথমিক দিকনির্দেশনা। এটি কোনো নিশ্চিত চিকিৎসা বা প্রেসক্রিপশন নয়। অনুগ্রহ করে একজন নিবন্ধিত চিকিৎসকের পরামর্শ নিন।"
    else:
        reply = (
            f"Based on your symptoms, we recommend consulting a specialist in **{spec_label}**. "
            f"A healthcare provider in this field can conduct an accurate clinical examination and suggest appropriate investigations if necessary."
        )
        tips = [
            "Note the exact onset, frequency, and severity of your symptoms.",
            "Bring any recent lab test reports, current prescriptions, or medical summaries.",
            "Keep track of whether symptoms worsen with food, exertion, or specific times of day."
        ]
        red_flags_to_watch = [
            "Chest pain, shortness of breath, or palpitations",
            "Persistent high fever (>103°F / 39.4°C) unresponsive to standard antipyretics",
            "Sudden numbness, weakness, severe abdominal pain, or loss of consciousness"
        ]
        disclaimer = "MediBridge AI Guidance is designed for navigation and informational purposes only. It is not a clinical diagnosis or medical prescription. Always consult a licensed medical doctor."

    return {
        "emergency": False,
        "reply": reply,
        "primary_specialty": primary_spec,
        "primary_specialty_label": spec_label,
        "suggested_specialties": specs,
        "preparation_tips": tips,
        "red_flags_to_watch": red_flags_to_watch,
        "ml_info": ml_info,
        "disclaimer": disclaimer,
    }


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
