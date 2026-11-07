"""M14 — research prototype document-type classifier (lab / prescription / discharge / other). Not clinical validation."""
import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import require_role
from app.models import Profile

router = APIRouter(prefix="/ml", tags=["ml"])
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "model.joblib")
ABSTAIN_THRESHOLD = 0.55
_model = None


class ClassifyIn(BaseModel):
    text: str


def predict(text: str):
    global _model
    import joblib
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError("Model not trained. Run: python -m ml.train")
        _model = joblib.load(MODEL_PATH)
    proba = _model.predict_proba([text])[0]
    i = int(proba.argmax())
    label, conf = _model.classes_[i], float(proba[i])
    if conf < ABSTAIN_THRESHOLD:
        return {"label": "other", "confidence": conf, "abstained": True}
    return {"label": str(label), "confidence": conf, "abstained": False}


@router.post("/document-classify")
def classify(body: ClassifyIn, user: Profile = Depends(require_role("super_admin", "reviewer"))):
    try:
        res = predict(body.text)
    except RuntimeError as e:
        return {"label": "other", "confidence": 0.0, "abstained": True, "note": str(e)}
    return {**res, "label_note": "research prototype — not clinically validated"}
