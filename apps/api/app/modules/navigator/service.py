"""M8 — SmartCare Navigator. Order is fixed: red flags -> specialty -> clinical gate -> score -> (optional) affordability reorder."""
import re
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import SUPPORTED_GEOGRAPHY
from app.models import (DoctorFacility, DoctorProfile, Facility, FacilityService, Specialty)
from app.modules.directory.service import badge, is_stale

# Seed rules — require clinician review before any production use.
RED_FLAGS = [
    ("chest_pain_breathless", "cardiac/respiratory", [r"chest pain.*(breath|shortness)", r"(breath|shortness).*chest pain",
        r"severe chest pain", r"বুকে তীব্র ব্যথা", r"বুকে ব্যথা.*শ্বাস", r"শ্বাসকষ্ট.*বুকে"]),
    ("severe_bleeding", "bleeding", [r"severe bleeding", r"bleeding (heavily|a lot|won'?t stop)", r"heavy bleeding", r"প্রচুর রক্তপাত", r"রক্তপাত বন্ধ হচ্ছে না"]),
    ("unconscious", "consciousness", [r"unconscious", r"unresponsive", r"passed out", r"fainted and (not|won'?t)", r"অজ্ঞান", r"জ্ঞান নেই"]),
    ("stroke_signs", "neurological", [r"face drooping", r"slurred speech", r"sudden weakness", r"one side.*(weak|numb)", r"stroke", r"মুখ বেঁকে", r"কথা জড়িয়ে", r"স্ট্রোক"]),
    ("seizure", "neurological", [r"seizure", r"convulsion", r"খিঁচুনি", r"মৃগী"]),
    ("anaphylaxis", "allergy", [r"severe allergic", r"anaphyla", r"throat (closing|swelling)", r"তীব্র অ্যালার্জি", r"গলা ফুলে"]),
    ("self_harm", "mental health", [r"suicid", r"kill myself", r"end my life", r"self[- ]harm", r"আত্মহত্যা", r"নিজেকে শেষ"]),
]
EMERGENCY_MESSAGE = {
    "en": "This may be an emergency. Call 999 now or go to the nearest emergency department. Do not wait for an appointment.",
    "bn": "এটি জরুরি অবস্থা হতে পারে। এখনই ৯৯৯-এ কল করুন বা নিকটতম জরুরি বিভাগে যান। অ্যাপয়েন্টমেন্টের জন্য অপেক্ষা করবেন না।",
}
CRISIS_MESSAGE = {
    "en": "You are not alone. Please call 999 or reach a trusted person or local crisis service right now.",
    "bn": "আপনি একা নন। এখনই ৯৯৯-এ কল করুন বা বিশ্বস্ত কাউকে/স্থানীয় সহায়তা সেবাকে জানান।",
}

# keyword -> specialty code (rule table; LLM may only pick from SPECIALTY_CODES, never diagnose)
SPECIALTY_MAP = {
    "general_medicine": ["fever", "cough", "cold", "weakness", "tired", "জ্বর", "কাশি", "দুর্বল"],
    "cardiology": ["palpitation", "heart", "blood pressure", "chest", "হৃদ", "বুক ধড়ফড়", "রক্তচাপ"],
    "endocrinology": ["diabetes", "sugar", "glucose", "thyroid", "ডায়াবেটিস", "সুগার", "থাইরয়েড"],
    "hematology": ["anemia", "anaemia", "hemoglobin", "cbc", "platelet", "রক্তশূন্যতা", "হিমোগ্লোবিন"],
    "neurology": ["headache", "migraine", "numbness", "dizziness", "মাথাব্যথা", "মাইগ্রেন", "ঝিমঝিম"],
    "pediatrics": ["child", "baby", "infant", "শিশু", "বাচ্চা"],
    "gynecology": ["pregnan", "period", "menstrual", "গর্ভ", "মাসিক"],
    "orthopedics": ["bone", "joint", "knee", "back pain", "fracture", "হাড়", "জয়েন্ট", "হাঁটু", "কোমর ব্যথা"],
    "dermatology": ["skin", "rash", "itch", "acne", "চর্ম", "ত্বক", "চুলকানি"],
    "ent": ["ear", "nose", "throat", "sinus", "কান", "নাক", "গলা"],
    "gastroenterology": ["stomach", "gastric", "acidity", "diarrhea", "vomit", "পেট", "গ্যাস্ট্রিক", "বমি", "ডায়রিয়া"],
}
WEIGHTS = dict(specialty_fit=30, credential=25, experience=15, service_fit=10, availability=10, access=10)


def red_flag_check(text: str) -> dict:
    """Deterministic, runs FIRST. If emergency, nothing downstream runs."""
    t = (text or "").lower()
    hits = []
    for code, category, patterns in RED_FLAGS:
        if any(re.search(p, t) for p in patterns):
            hits.append({"code": code, "category": category})
    crisis = any(h["code"] == "self_harm" for h in hits)
    return {"emergency": bool(hits), "red_flags": hits, "crisis": crisis}


def suggest_specialties(text: str, limit=3) -> list[str]:
    t = (text or "").lower()
    scored = []
    for code, kws in SPECIALTY_MAP.items():
        n = sum(1 for k in kws if k.lower() in t)
        if n:
            scored.append((n, code))
    scored.sort(reverse=True)
    return [c for _, c in scored[:limit]] or ["general_medicine"]


def triage(text: str, lang="en") -> dict:
    rf = red_flag_check(text)
    if rf["emergency"]:
        msg = (CRISIS_MESSAGE if rf["crisis"] else EMERGENCY_MESSAGE)
        return {"emergency": True, "red_flags": rf["red_flags"], "suggested_specialties": [],
                "guidance": msg[lang if lang in msg else "en"], "emergency_number": "999"}
    return {"emergency": False, "red_flags": [], "suggested_specialties": suggest_specialties(text), "guidance": None}


def clinical_gate(db: Session, doctor: DoctorProfile, facility: Facility, specialty_code: str, needs_emergency: bool) -> str:
    """pass | fail | needs_review. Price/popularity never enter here."""
    spec = db.get(Specialty, doctor.specialty_id) if doctor.specialty_id else None
    if not spec or spec.code != specialty_code:
        return "fail"
    if doctor.verification == "rejected":
        return "fail"
    svc = db.scalars(select(FacilityService).where(FacilityService.facility_id == facility.id,
                                                   FacilityService.service_code == specialty_code)).first()
    if svc is not None and svc.available is False:
        return "fail"
    if needs_emergency and not facility.has_emergency:
        return "fail" if facility.has_emergency is False else "needs_review"
    if svc is None or svc.available is None or doctor.verification != "verified":
        return "needs_review"
    return "pass"


def score(db: Session, doctor: DoctorProfile, facility: Facility, rank_index: int) -> tuple[float, list[str]]:
    reasons = []
    s = WEIGHTS["specialty_fit"] * (1.0 if rank_index == 0 else 0.8)
    reasons.append("Specialty matches your concern")
    cred = {"verified": 1.0, "pending": 0.4}.get(doctor.verification, 0.1)
    s += WEIGHTS["credential"] * cred
    reasons.append("Credential verified" if cred == 1.0 else "Credential not fully verified")
    exp = min((doctor.experience_years or 0) / 20, 1.0)
    s += WEIGHTS["experience"] * exp
    svc = db.scalars(select(FacilityService).where(FacilityService.facility_id == facility.id,
                                                   FacilityService.service_code == (db.get(Specialty, doctor.specialty_id).code))).first()
    s += WEIGHTS["service_fit"] * (1.0 if svc and svc.available else 0.3)
    s += WEIGHTS["availability"] * 0.5      # no live availability in MVP: neutral
    s += WEIGHTS["access"] * (0.8 if facility.type == "government" else 0.6)
    if svc and svc.available:
        reasons.append("Facility confirms this service")
    return round(s, 1), reasons


def affordability(budget: str | None, fee: int | None) -> str:
    if fee is None:
        return "unknown"
    caps = {"low": 600, "medium": 1200, "high": 2500}
    if budget in (None, "flexible"):
        return "within"
    cap = caps.get(budget, 1200)
    return "within" if fee <= cap else ("near" if fee <= cap * 1.25 else "above")


def match(db: Session, specialties: list[str], *, budget: str | None, care_pref: list[str], district: str | None,
          budget_first: bool = False, needs_emergency: bool = False) -> dict:
    if district and district.lower() not in SUPPORTED_GEOGRAPHY:
        return {"unsupported": True, "message": "This area is not supported yet. Currently only Dhaka.",
                "eligible": [], "needs_review": [], "excluded_count": 0}
    eligible, review, excluded = [], [], 0
    docs = db.scalars(select(DoctorProfile)).all()
    for d in docs:
        spec = db.get(Specialty, d.specialty_id) if d.specialty_id else None
        if not spec or spec.code not in specialties:
            continue
        links = db.execute(select(DoctorFacility, Facility).join(Facility, Facility.id == DoctorFacility.facility_id)
                           .where(DoctorFacility.doctor_id == d.user_id)).all()
        for df, f in links:
            if care_pref and "any" not in care_pref and f.type not in care_pref:
                continue
            gate = clinical_gate(db, d, f, spec.code, needs_emergency)
            if gate == "fail":
                excluded += 1
                continue
            sc, reasons = score(db, d, f, specialties.index(spec.code))
            aff = affordability(budget, df.fee_bdt)
            card = {"doctor_id": d.user_id, "doctor_name": d.full_name, "specialty": spec.name_en,
                    "facility_id": f.id, "facility_name": f.name, "facility_type": f.type,
                    "score": sc, "gate": gate, "reasons": reasons + ([f"Fee {('BDT ' + str(df.fee_bdt)) if df.fee_bdt is not None else 'Not confirmed'}"]),
                    "cost_state": "confirmed" if df.fee_bdt is not None else "not_confirmed",
                    "fee_label": f"BDT {df.fee_bdt}" if df.fee_bdt is not None else "Not confirmed",
                    "affordability": aff, "verification": badge(d.verification),
                    "data_confidence": "low" if (is_stale(d.last_verified_at) or d.verification != "verified") else "high",
                    "stale": is_stale(d.last_verified_at), "is_sample": d.is_sample}
            (eligible if gate == "pass" else review).append(card)
    key = (lambda c: (c["affordability"] != "within", -c["score"])) if budget_first else (lambda c: -c["score"])
    eligible.sort(key=key)      # budget toggle reorders ONLY already-eligible providers
    review.sort(key=lambda c: -c["score"])
    return {"unsupported": False, "eligible": eligible[:10], "needs_review": review[:10], "excluded_count": excluded}
