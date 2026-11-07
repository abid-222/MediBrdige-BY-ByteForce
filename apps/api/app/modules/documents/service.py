"""M6 pipeline: validate -> text-extract (PyMuPDF) -> OCR (optional) -> classify -> parse -> normalise -> validate -> save.
Rules: never infer missing units/ranges; never silently auto-correct; confidence < 0.85 is flagged."""
import re
from sqlalchemy.orm import Session
from app.core.config import OCR_CONFIDENCE_THRESHOLD, SUPPORTED_REPORT_TYPES
from app.models import Document, Extraction, Observation, TestCatalog

EXTRACTOR_VERSION = "regex-0.1"

CATALOG = [
    # code, name, synonyms, canonical unit, convertible {unit: multiplier-to-canonical}, plausible (lo, hi) in canonical, report type
    ("HGB", "Hemoglobin", ["hemoglobin", "haemoglobin", "hb", "hgb"], "g/dL", {"g/dl": 1, "g/l": 0.1}, (3, 25), "cbc"),
    ("WBC", "Total WBC", ["wbc", "total wbc", "white blood cell", "total leukocyte count", "tlc"], "10^9/L",
     {"10^9/l": 1, "x10^9/l": 1, "10^3/ul": 1, "k/ul": 1, "/cumm": 0.001, "/ul": 0.001, "cells/cumm": 0.001}, (0.5, 100), "cbc"),
    ("RBC", "RBC count", ["rbc", "red blood cell", "total rbc"], "10^12/L", {"10^12/l": 1, "x10^12/l": 1, "million/cumm": 1, "10^6/ul": 1}, (1, 9), "cbc"),
    ("PLT", "Platelet count", ["platelet", "platelets", "plt", "platelet count"], "10^9/L",
     {"10^9/l": 1, "x10^9/l": 1, "10^3/ul": 1, "k/ul": 1, "/cumm": 0.001, "lakh/cumm": 100}, (5, 1500), "cbc"),
    ("HCT", "Hematocrit (PCV)", ["hematocrit", "haematocrit", "pcv", "hct"], "%", {"%": 1}, (10, 70), "cbc"),
    ("MCV", "MCV", ["mcv"], "fL", {"fl": 1}, (50, 130), "cbc"),
    ("GLU", "Blood glucose", ["glucose", "blood glucose", "fasting blood sugar", "fbs", "rbs", "random blood sugar", "blood sugar"],
     "mg/dL", {"mg/dl": 1, "mmol/l": 18.0182}, (10, 900), "glucose"),
]
BY_CODE = {c[0]: c for c in CATALOG}


def seed_catalog(db: Session):
    for code, name, syn, unit, conv, _pl, _t in CATALOG:
        if not db.get(TestCatalog, code):
            db.add(TestCatalog(code=code, name_en=name, synonyms=syn, canonical_unit=unit, convertible_units=conv))
    db.commit()


def extract_text(path: str, mime: str) -> tuple[str, int, str | None]:
    """Returns (text, pages, error)."""
    if mime == "application/pdf":
        import fitz
        doc = fitz.open(path)
        if len(doc) > 30:
            return "", len(doc), "This PDF has more than 30 pages. Please upload only the relevant report pages."
        text = "\n".join(p.get_text() for p in doc)
        pages = len(doc)
        if len(text.strip()) >= 20:
            return text, pages, None
        # scanned PDF -> OCR each page
        try:
            return _ocr_pdf(doc), pages, None
        except Exception as e:  # OCR engine not installed
            return "", pages, f"scan_needs_ocr:{e}"
    try:
        return _ocr_image(path), 1, None
    except Exception as e:
        return "", 1, f"scan_needs_ocr:{e}"


def _prep(img):
    """Grayscale -> upscale small scans -> autocontrast -> median denoise. Improves OCR on phone photos / faxes."""
    from PIL import ImageFilter, ImageOps
    img = ImageOps.exif_transpose(img).convert("L")
    if max(img.size) < 1800:
        img = img.resize((img.width * 2, img.height * 2))
    return ImageOps.autocontrast(img).filter(ImageFilter.MedianFilter(3))


def _best(candidates: list[str]) -> str:
    """Preprocessing helps clean scans but can hurt very noisy ones, so try both and keep the text with more recognised test lines."""
    return max(candidates, key=lambda t: (len(parse_report(t)["rows"]), len(t)))


def _ocr_image(path: str) -> str:
    try:
        import pytesseract
        from PIL import Image
        raw_img = Image.open(path)
        return _best([pytesseract.image_to_string(raw_img, config="--psm 6"),
                      pytesseract.image_to_string(_prep(raw_img), config="--psm 6")])
    except ImportError:
        raise RuntimeError("No OCR engine installed (install pytesseract or paddleocr)")


def _ocr_pdf(doc) -> str:
    import io
    out = []
    import pytesseract
    from PIL import Image
    for page in doc:
        pix = page.get_pixmap(dpi=200)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        out.append(_best([pytesseract.image_to_string(img, config="--psm 6"), pytesseract.image_to_string(_prep(img), config="--psm 6")]))
    return "\n".join(out)


def classify(text: str) -> str:
    t = text.lower()
    found = {m for c in CATALOG for s in c[2] if re.search(rf"\b{re.escape(s)}\b", t) for m in [c[6]]}
    if "cbc" in found or "complete blood count" in t:
        return "cbc"
    if "glucose" in found or "blood sugar" in t:
        return "glucose"
    return "other"


NUM = r"-?\d+(?:[.,]\d+)?"
LINE = re.compile(rf"^\s*(?P<name>[A-Za-z][A-Za-z ()/%.\-]*?)\s*[:\-]?\s+(?P<val>[0-9OolI][0-9OolI.,]*)\s*(?P<unit>10\^\d+/[A-Za-z]+|[A-Za-z%µμ/][A-Za-z%/^0-9.*µμ]*)?\s*(?:(?P<lo>{NUM})\s*(?:-|–|to)\s*(?P<hi>{NUM}))?\s*$")
DATE = re.compile(r"(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})")


def _lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _match_test(name: str):
    """Returns (catalog_row, exact). Near-misses from OCR (WEC for WBC) match with exact=False -> flagged for review."""
    n = name.strip().lower()
    for c in CATALOG:
        if n in c[2] or any(n == s or n.startswith(s + " ") for s in c[2]):
            return c, True
    best = None
    for c in CATALOG:
        for syn in c[2]:
            if len(syn) < 3 or len(n) < 3:
                continue
            limit = 1 if len(syn) < 8 else 2
            d = _lev(n, syn)
            if d <= limit and (best is None or d < best[0]):
                best = (d, c)
    return (best[1], False) if best else (None, False)


def _norm_unit(u: str | None):
    """Deterministic OCR-glyph fixes only (10*9/L -> 10^9/L, x10^9/L, 10⁹). Returns (unit, changed)."""
    if not u:
        return u, False
    n = u.replace("×", "x").replace("⁹", "^9").replace("¹²", "^12").replace("³", "^3").replace("⁶", "^6")
    n = re.sub(r"(10)\*(\d+)", r"\1^\2", n)
    return n, n != u


def _norm_date(s: str | None):
    if not s:
        return None
    if re.match(r"\d{4}-", s):
        return s
    d, m, y = re.split(r"[/-]", s)
    return f"{y}-{m}-{d}"


def parse_report(text: str) -> dict:
    date = DATE.search(text)
    lab = re.search(r"(?:lab(?:oratory)?|hospital)\s*[:\-]\s*(.+)", text, re.I)
    rows, unparsed = [], []
    for raw in text.splitlines():
        glyph_fixed = re.sub(r"10[*%xX^°·](\d+)", r"10^\1", raw)        # OCR reads '^' as '*': deterministic glyph fix, flagged below
        m = LINE.match(glyph_fixed)
        if not m:
            if re.search(r"\d", raw) and len(raw.strip()) > 4 and not DATE.search(raw) and _match_test(raw.split()[0] if raw.split() else "")[0]:
                unparsed.append(raw.strip())          # a recognisable test line we could not parse: show it to the reviewer
            continue
        cat, exact = _match_test(m["name"])
        if not cat:
            if re.search(r"\d", raw) and len(raw.strip()) > 4 and not DATE.search(raw):
                unparsed.append(raw.strip())          # visible to the reviewer, never silently dropped
            continue
        code, _name, _syn, canon, conv, (plo, phi), _t = cat
        val_raw = m["val"]
        notes = []
        conf = 0.97
        if not exact:
            conf = min(conf, 0.6)
            notes.append("test_name_uncertain")      # e.g. 'WEC' read for 'WBC': needs a human to confirm
        # OCR-confusable characters: flag, never silently fix
        if re.search(r"[OolI]", val_raw):
            conf = min(conf, 0.55)
            notes.append("ambiguous_characters")
        try:
            val = float(val_raw.replace(",", "."))
        except ValueError:
            val = None
            conf = min(conf, 0.3)
            notes.append("unparseable_value")
        unit, unit_changed = _norm_unit(m["unit"])
        unit_changed = unit_changed or glyph_fixed != raw
        if unit_changed:
            conf = min(conf, 0.9)
            notes.append("unit_normalized")
        if not unit:
            conf = min(conf, 0.6)
            notes.append("unit_missing")          # never infer a missing unit
        elif unit.lower() not in conv:
            conf = min(conf, 0.6)
            notes.append("unit_unrecognised")
        if val is not None and unit and unit.lower() in conv:
            cv = val * conv[unit.lower()]
            if not (plo <= cv <= phi):
                conf = min(conf, 0.6)
                notes.append("implausible_value")
        lo = float(m["lo"].replace(",", ".")) if m["lo"] else None
        hi = float(m["hi"].replace(",", ".")) if m["hi"] else None
        rows.append({"test_code": code, "test_name": m["name"].strip(), "value_raw": val_raw, "value": val,
                     "unit": unit, "ref_low": lo, "ref_high": hi, "confidence": conf, "notes": notes,
                     "low_confidence": conf < OCR_CONFIDENCE_THRESHOLD})
    return {"observed_on": _norm_date(date.group(1)) if date else None,
            "lab_name": lab.group(1).strip() if lab else None, "rows": rows, "unparsed_lines": unparsed[:20]}


def run_pipeline(db: Session, doc: Document):
    """Never leaves a document stuck in 'processing': any failure ends as status=failed with a user-safe message."""
    import logging
    doc.status = "processing"
    db.commit()
    try:
        return _run(db, doc)
    except Exception:
        db.rollback()
        logging.getLogger("medibridge").exception("document pipeline failed doc=%s", doc.id)   # details server-side only
        doc = db.get(Document, doc.id)
        doc.status, doc.status_message = "failed", "This file could not be read. Please upload a clearer copy; manual review is required."
        db.commit()
        return doc


def _run(db: Session, doc: Document):
    from app.core import storage
    with storage.local_path(doc.file_ref) as path:
        text, pages, err = extract_text(path, doc.mime or "application/pdf")
    doc.page_count = pages
    if err:
        doc.status = "failed"
        doc.status_message = ("This looks like a scan, but no OCR engine is installed on the server."
                              if err.startswith("scan_needs_ocr") else err)
        db.commit()
        return doc
    doc.doc_type = classify(text)
    if doc.doc_type not in SUPPORTED_REPORT_TYPES:
        doc.status = "unsupported"
        doc.status_message = "This report type is not supported yet. Supported: CBC and Blood Glucose."
        db.add(Extraction(document_id=doc.id, extractor_version=EXTRACTOR_VERSION, raw_text=text,
                          structured_json={}, status="unsupported"))
        db.commit()
        return doc
    parsed = parse_report(text)
    doc_conf = min([r["confidence"] for r in parsed["rows"]], default=0.0)
    db.add(Extraction(document_id=doc.id, extractor_version=EXTRACTOR_VERSION, raw_text=text,
                      structured_json=parsed, confidence=doc_conf, status="unverified"))
    for r in parsed["rows"]:
        db.add(Observation(patient_id=doc.patient_id, document_id=doc.id, test_code=r["test_code"],
                           value_num=r["value"], value_raw=r["value_raw"], unit=r["unit"], ref_low=r["ref_low"],
                           ref_high=r["ref_high"], observed_on=parsed["observed_on"], lab_name=parsed["lab_name"],
                           confidence=r["confidence"], low_confidence=r["low_confidence"], status="unverified",
                           is_sample=doc.is_sample))
    doc.status = "processed" if parsed["rows"] else "failed"
    if not parsed["rows"]:
        doc.status_message = "No supported test values were found in this report. Manual review is required."
    elif parsed["unparsed_lines"]:
        doc.status_message = f"{len(parsed['unparsed_lines'])} line(s) with numbers could not be read. Check the original file."
    else:
        doc.status_message = None
    db.commit()
    return doc
