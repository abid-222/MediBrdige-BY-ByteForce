import hashlib, os, time
import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, File, Header, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core import audit, storage
from app.core.access import require_access
from app.core.config import MAX_UPLOAD_BYTES, SIGNED_URL_TTL_SECONDS, settings
from app.core.db import SessionLocal, get_db
from app.core.errors import AppError
from app.core.security import get_current_user, require_role
from app.models import Document, DoctorProfile, Extraction, Observation, Profile
from app.modules.documents import service

router = APIRouter(tags=["documents"])
MAGIC = {b"%PDF": "application/pdf", b"\xff\xd8\xff": "image/jpeg", b"\x89PNG": "image/png"}


def sniff(data: bytes) -> str | None:
    for sig, mime in MAGIC.items():
        if data.startswith(sig):
            return mime
    return None


def _process_bg(doc_id: str):
    db = SessionLocal()
    try:
        doc = db.get(Document, doc_id)
        if doc:
            service.run_pipeline(db, doc)
    finally:
        db.close()


@router.post("/documents")
async def upload(bg: BackgroundTasks, file: UploadFile = File(...), idempotency_key: str | None = Header(default=None),
                 user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    if idempotency_key:
        prior = db.scalar(select(Document).where(Document.idempotency_key == f"{user.id}:{idempotency_key}"))
        if prior:
            return {"id": prior.id, "status": prior.status, "duplicate": True}
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise AppError(413, "file_too_large", "File must be 10MB or smaller")
    mime = sniff(data)
    if not mime:
        raise AppError(415, "unsupported_file", "Only PDF, JPG or PNG files are accepted")
    checksum = hashlib.sha256(data).hexdigest()
    ref = storage.put(f"{user.id}/{checksum[:32]}", data, mime)   # server-generated key; the client filename is never used
    doc = Document(patient_id=user.id, uploaded_by=user.id, file_ref=ref, mime=mime, checksum=checksum,
                   idempotency_key=f"{user.id}:{idempotency_key}" if idempotency_key else None)
    db.add(doc)
    db.commit()
    audit.log(db, user, "documents.upload", resource_type="documents", resource_id=doc.id, patient_id=user.id)
    bg.add_task(_process_bg, doc.id)
    return {"id": doc.id, "status": doc.status}


@router.post("/documents/{doc_id}/process")
def process(doc_id: str, bg: BackgroundTasks, user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc or doc.patient_id != user.id:
        raise AppError(404, "not_found", "Document not found")
    bg.add_task(_process_bg, doc.id)
    return {"id": doc.id, "status": "processing"}


def _doc_or_404(db, doc_id):
    doc = db.get(Document, doc_id)
    if not doc:
        raise AppError(404, "not_found", "Document not found")
    return doc


@router.get("/documents")
def list_documents(user: Profile = Depends(require_role("patient")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Document).where(Document.patient_id == user.id).order_by(Document.created_at.desc())).all()
    counts = {}
    for o in db.scalars(select(Observation).where(Observation.patient_id == user.id)).all():
        c = counts.setdefault(o.document_id, {"total": 0, "verified": 0, "low": 0})
        c["total"] += 1; c["verified"] += o.status == "doctor_verified"; c["low"] += bool(o.low_confidence or o.flagged_wrong)
    return {"items": [{"id": d.id, "status": d.status, "doc_type": d.doc_type, "message": d.status_message, "mime": d.mime,
                       "page_count": d.page_count, "created_at": d.created_at, "is_sample": d.is_sample,
                       "total_values": counts.get(d.id, {}).get("total", 0), "verified_values": counts.get(d.id, {}).get("verified", 0),
                       "low_confidence_values": counts.get(d.id, {}).get("low", 0)} for d in rows]}


@router.get("/documents/{doc_id}")
def get_document(doc_id: str, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = _doc_or_404(db, doc_id)
    require_access(db, user, doc.patient_id, "documents", "read", doc.id)
    return {"id": doc.id, "status": doc.status, "doc_type": doc.doc_type, "message": doc.status_message,
            "page_count": doc.page_count, "mime": doc.mime, "patient_id": doc.patient_id, "is_sample": doc.is_sample}


@router.get("/documents/{doc_id}/extractions")
def get_extractions(doc_id: str, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = _doc_or_404(db, doc_id)
    require_access(db, user, doc.patient_id, "documents", "read_extractions", doc.id)
    ext = db.scalars(select(Extraction).where(Extraction.document_id == doc.id)).first()
    obs = db.scalars(select(Observation).where(Observation.document_id == doc.id)).all()
    return {"document_status": doc.status, "message": doc.status_message,
            "extractor_version": ext.extractor_version if ext else None,
            "raw_text": ext.raw_text if ext else None,
            "rows": [{"observation_id": o.id, "test_code": o.test_code, "value": o.value_raw, "unit": o.unit,
                      "ref_low": o.ref_low, "ref_high": o.ref_high, "confidence": o.confidence,
                      "low_confidence": o.low_confidence, "status": o.status, "flagged_wrong": o.flagged_wrong}
                     for o in obs]}


@router.get("/documents/{doc_id}/file-url")
def file_url(doc_id: str, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = _doc_or_404(db, doc_id)
    require_access(db, user, doc.patient_id, "documents", "file", doc.id)
    token = jwt.encode({"typ": "file", "doc": doc.id, "exp": int(time.time()) + SIGNED_URL_TTL_SECONDS}, settings.jwt_secret, algorithm="HS256")
    return {"url": f"/api/v1/files/{token}", "expires_in": SIGNED_URL_TTL_SECONDS}


@router.get("/files/{token}")
def serve_file(token: str, db: Session = Depends(get_db)):
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except Exception:
        raise AppError(403, "link_expired", "This link has expired")
    if data.get("typ") != "file":
        raise AppError(403, "link_expired", "This link has expired")
    doc = _doc_or_404(db, data["doc"])
    return Response(storage.read(doc.file_ref), media_type=doc.mime, headers={"Content-Disposition": "inline; filename=report"})


class FieldPatch(BaseModel):
    observation_id: str
    flag_wrong: bool | None = None
    patient_confirm: bool | None = None
    value: str | None = None
    unit: str | None = None


@router.patch("/extractions/{doc_id}/fields")
def patch_fields(doc_id: str, body: FieldPatch, user: Profile = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = _doc_or_404(db, doc_id)
    obs = db.get(Observation, body.observation_id)
    if not obs or obs.document_id != doc.id:
        raise AppError(404, "not_found", "Value not found")
    require_access(db, user, doc.patient_id, "observations", "update", obs.id)
    before = {"value": obs.value_raw, "unit": obs.unit, "status": obs.status}
    if user.role == "patient":
        if body.value is not None or body.unit is not None:
            raise AppError(403, "doctor_only", "Only a doctor can correct extracted values. Flag it as wrong instead.")
        if body.flag_wrong is not None:
            obs.flagged_wrong = body.flag_wrong
        if body.patient_confirm:
            obs.status = "patient_confirmed"
    elif user.role == "doctor":
        if body.value is not None:
            try:
                obs.value_num = float(body.value.replace(",", "."))
            except ValueError:
                raise AppError(400, "invalid_value", "Value must be numeric")
            obs.value_raw = body.value
            obs.low_confidence = False
            obs.confidence = 1.0
        if body.unit is not None:
            obs.unit = body.unit
        obs.status = "unverified"  # a correction does not verify; verify is an explicit second step
        obs.flagged_wrong = False
    db.commit()
    audit.log(db, user, "observations.correct", resource_type="observation", resource_id=obs.id, patient_id=doc.patient_id,
              before=before, after={"value": obs.value_raw, "unit": obs.unit, "status": obs.status})
    return {"observation_id": obs.id, "status": obs.status, "flagged_wrong": obs.flagged_wrong}
