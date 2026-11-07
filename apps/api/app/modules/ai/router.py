from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.access import require_access
from app.core.db import get_db
from app.core.errors import AppError
from app.core.security import require_role
from app.models import AiOutput, Document, Observation, Profile
from app.modules.ai import service
from app.modules.navigator.service import red_flag_check, EMERGENCY_MESSAGE

router = APIRouter(prefix="/ai", tags=["ai"])


class ExplainIn(BaseModel):
    document_id: str
    lang: str = "en"
    question: str | None = None


class SummaryIn(BaseModel):
    patient_id: str
    lang: str = "en"


class FeedbackIn(BaseModel):
    output_id: str
    thumbs: str  # up|down


@router.post("/report-explain")
def explain(body: ExplainIn, user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    if body.question:
        rf = red_flag_check(body.question)
        if rf["emergency"]:
            return {"emergency": True, "guidance": EMERGENCY_MESSAGE.get(body.lang, EMERGENCY_MESSAGE["en"])}
    doc = db.get(Document, body.document_id)
    if not doc:
        raise AppError(404, "not_found", "Document not found")
    require_access(db, user, doc.patient_id, "documents", "ai_explain", doc.id)
    obs = db.scalars(select(Observation).where(Observation.document_id == doc.id)).all()
    return service.generate(db, user.id, "report_explain", obs, body.lang)


@router.post("/clinical-summary")
def summary(body: SummaryIn, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    require_access(db, user, body.patient_id, "observations", "ai_summary")
    obs = db.scalars(select(Observation).where(Observation.patient_id == body.patient_id)
                     .order_by(Observation.observed_on.desc()).limit(30)).all()
    return service.generate(db, user.id, "clinical_summary", obs, body.lang)


@router.post("/note-draft")
def note_draft(body: SummaryIn, user: Profile = Depends(require_role("doctor")), db: Session = Depends(get_db)):
    require_access(db, user, body.patient_id, "notes", "ai_note_draft")
    require_access(db, user, body.patient_id, "observations", "ai_note_draft")
    obs = db.scalars(select(Observation).where(Observation.patient_id == body.patient_id)
                     .order_by(Observation.observed_on.desc()).limit(30)).all()
    res = service.generate(db, user.id, "note_draft", obs, body.lang)
    res["draft_text"] = "\n".join(f"- {f['text']}" for f in res["known_facts"]) or service.NOT_FOUND[body.lang]
    return res    # a draft is never an official record until a verified doctor signs it


@router.post("/feedback")
def feedback(body: FeedbackIn, user: Profile = Depends(require_role("patient", "doctor")), db: Session = Depends(get_db)):
    row = db.get(AiOutput, body.output_id)
    if not row or row.user_id != user.id:
        raise AppError(404, "not_found", "Output not found")
    row.feedback = body.thumbs
    db.commit()
    return {"ok": True}
