"""M6 pipeline: validate -> text-extract (PyMuPDF) -> OCR (optional) -> classify -> parse -> normalise -> validate -> save.
Rules: never infer missing units/ranges; never silently auto-correct; confidence < 0.85 is flagged."""
import re
import httpx
from sqlalchemy.orm import Session
from app.core.config import OCR_CONFIDENCE_THRESHOLD, SUPPORTED_REPORT_TYPES, settings
from app.models import Document, Extraction, Observation, TestCatalog

EXTRACTOR_VERSION = "regex-0.2"

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
    ("MCH", "MCH", ["mch", "mean corpuscular hemoglobin"], "pg", {"pg": 1}, (10, 50), "cbc"),
    ("MCHC", "MCHC", ["mchc", "mean corpuscular hemoglobin concentration"], "g/dL", {"g/dl": 1, "g/l": 0.1, "%": 1}, (20, 50), "cbc"),
    ("RDW", "RDW", ["rdw", "rdw-cv", "rdw-sd", "red cell distribution width"], "%", {"%": 1, "fl": 1}, (5, 30), "cbc"),
    ("ESR", "ESR", ["esr", "erythrocyte sedimentation rate"], "mm/hr", {"mm/hr": 1, "mm/1st hr": 1, "mm": 1}, (0, 150), "cbc"),
    ("NEUT", "Neutrophils", ["neutrophil", "neutrophils", "polymorphs", "segs"], "%", {"%": 1}, (10, 95), "cbc"),
    ("LYMPH", "Lymphocytes", ["lymphocyte", "lymphocytes"], "%", {"%": 1}, (5, 80), "cbc"),
    ("GLU", "Blood glucose", ["glucose", "blood glucose", "fasting blood sugar", "fbs", "rbs", "random blood sugar", "blood sugar"],
     "mg/dL", {"mg/dl": 1, "mmol/l": 18.0182}, (10, 900), "glucose"),
    ("HBA1C", "HbA1c", ["hba1c", "glycated hemoglobin", "glycohemoglobin", "hba1 c"], "%", {"%": 1, "mmol/mol": 0.09148}, (3, 20), "glucose"),
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
        except Exception as e:
            if settings.gemini_api_key:
                try:
                    return _gemini_ocr_pdf(doc), pages, None
                except Exception as ge:
                    return "", pages, f"scan_needs_ocr:{ge}"
            return "", pages, f"scan_needs_ocr:{e}"
    try:
        return _ocr_image(path), 1, None
    except Exception as e:
        if settings.gemini_api_key:
            try:
                return _gemini_ocr_image(path, mime), 1, None
            except Exception as ge:
                return "", 1, f"scan_needs_ocr:{ge}"
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
    except Exception:
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


def _gemini_ocr_pdf(doc) -> str:
    import base64
    out = []
    for page in doc:
        pix = page.get_pixmap(dpi=150)
        img_bytes = pix.tobytes("jpeg")
        b64 = base64.b64encode(img_bytes).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
        body = {
            "contents": [{
                "parts": [
                    {"text": "Extract all medical laboratory report text verbatim. Preserve every test parameter, result, unit, and reference range clearly. Do not summarize."},
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}}
                ]
            }],
            "generationConfig": {"temperature": 0.0}
        }
        r = httpx.post(url, json=body, timeout=30)
        if r.status_code == 200:
            out.append(r.json()["candidates"][0]["content"]["parts"][0]["text"])
        else:
            raise RuntimeError(f"Gemini OCR error: {r.text}")
    return "\n".join(out)


def _gemini_ocr_image(path: str, mime: str = "image/jpeg") -> str:
    import base64
    with open(path, "rb") as f:
        img_bytes = f.read()
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    actual_mime = mime if mime in ("image/jpeg", "image/png", "image/webp") else "image/jpeg"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    body = {
        "contents": [{
            "parts": [
                {"text": "Extract all medical laboratory report text verbatim. Preserve every test parameter, result, unit, and reference range clearly. Do not summarize."},
                {"inline_data": {"mime_type": actual_mime, "data": b64}}
            ]
        }],
        "generationConfig": {"temperature": 0.0}
    }
    r = httpx.post(url, json=body, timeout=30)
    if r.status_code == 200:
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    raise RuntimeError(f"Gemini OCR error: {r.text}")


def classify(text: str) -> str:
    t = text.lower()
    found = {m for c in CATALOG for s in c[2] if re.search(rf"\b{re.escape(s)}\b", t) for m in [c[6]]}
    if "cbc" in found or any(w in t for w in ["cbc", "complete blood count", "haematology", "hematology", "hemogram", "full blood count", "fbc"]):
        return "cbc"
    if "glucose" in found or any(w in t for w in ["glucose", "blood sugar", "fasting blood sugar", "random blood sugar", "fbs", "rbs", "hba1c", "diabetes"]):
        return "glucose"
    return "other"


NUM = r"-?\d+(?:[.,]\d+)?"
LINE = re.compile(rf"^\s*(?P<name>[A-Za-z][A-Za-z ()/%.\-]*?)\s*[:\-]?\s+(?P<val>[0-9OolI][0-9OolI.,]*)\s*(?P<unit>10\^\d+/[A-Za-z]+|[A-Za-z%µμ/][A-Za-z%/^0-9.*µμ]*)?\s*(?:(?P<lo>{NUM})\s*(?:-|–|to)\s*(?P<hi>{NUM}))?\s*$")
RANGE_RE = re.compile(rf"^\s*(?P<lo>{NUM})\s*(?:-|–|to)\s*(?P<hi>{NUM})\s*$")
VAL_RE = re.compile(r"^[0-9OolI][0-9OolI.,]*$")
DATE = re.compile(r"(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{1,2}[-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s]\d{4})", re.I)

MONTHS = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
}


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
    s = s.strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    mon_m = re.match(r"^(\d{1,2})[-\s]([A-Za-z]+)[-\s](\d{4})$", s)
    if mon_m:
        d, mon, y = mon_m.group(1).zfill(2), mon_m.group(2)[:3].lower(), mon_m.group(3)
        if mon in MONTHS:
            return f"{y}-{MONTHS[mon]}-{d}"
    parts = re.split(r"[/-]", s)
    if len(parts) == 3:
        if len(parts[0]) == 4:
            return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
        return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
    return s


def _extract_lab_name(text: str) -> str | None:
    lab_m = re.search(r"(?:lab(?:oratory)?|hospital)\s*[:\-]\s*(.+)", text, re.I)
    if lab_m:
        return lab_m.group(1).split("·")[0].strip()
    for line in text.splitlines()[:12]:
        l = line.strip()
        if re.search(r"(?:report\b|header\b|interpretation|patient|collection)", l, re.I):
            continue
        if re.search(r"(?:diagnostic\s*(?:centre|center)|hospital|clinic|pathology|medical\s*(?:college|center))", l, re.I):
            return l.split("·")[0].strip()
    return None


def _ai_extract_rows(text: str) -> list[dict]:
    """Fallback when regex fails to match tabular or unstructured lab text."""
    if not (settings.gemini_api_key or settings.anthropic_api_key):
        return []
    prompt = f"""You are a precise clinical laboratory test extractor. Extract all medical laboratory tests and numerical results from the report text below into a valid JSON array of objects.
Only extract tests that have explicit numeric findings. Do not hallucinate or extrapolate.
Each object in the array must strictly have these keys:
- "test_name": string (the name of the test, e.g. "Hemoglobin", "Total WBC", "Blood glucose", "Platelet count")
- "value_raw": string (the numeric result string, e.g. "14.2", "7.5", "250")
- "unit": string or null (e.g. "g/dL", "10^9/L", "mg/dL", "%")
- "ref_low": number or null (lower reference range limit if present, e.g. 12.0)
- "ref_high": number or null (upper reference range limit if present, e.g. 16.0)

Report text:
{text}

Return ONLY valid JSON array without markdown fences or additional explanation."""

    try:
        raw_json = None
        if settings.gemini_api_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
            body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.0}}
            r = httpx.post(url, json=body, timeout=25)
            if r.status_code == 200:
                raw_json = r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        elif settings.anthropic_api_key:
            body = {"model": settings.anthropic_model, "max_tokens": 1500, "messages": [{"role": "user", "content": prompt}]}
            r = httpx.post("https://api.anthropic.com/v1/messages", json=body, timeout=25,
                           headers={"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01"})
            if r.status_code == 200:
                raw_json = r.json()["content"][0]["text"].strip()
        if raw_json:
            import json
            cleaned = re.sub(r"^```(?:json)?", "", raw_json.strip()).rstrip("`").strip()
            data = json.loads(cleaned)
            if isinstance(data, list):
                return data
    except Exception as e:
        import logging
        logging.getLogger("medibridge").warning("AI extraction fallback error: %s", e)
    return []


def parse_report(text: str) -> dict:
    date = DATE.search(text)
    lab_name = _extract_lab_name(text)
    rows, unparsed = [], []
    seen_codes = set()

    # Pass 1: Line-by-line regex matching
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
        if code in seen_codes:
            continue
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
        seen_codes.add(code)

    # Pass 2: Multi-line / Tabular layout (e.g. PyMuPDF column table extractions)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]
        cat, exact = _match_test(line)
        if cat and cat[0] not in seen_codes:
            test_name = line
            val_raw, unit_raw, lo_raw, hi_raw = None, None, None, None
            j = i + 1
            while j < min(len(lines), i + 6):
                nxt = lines[j]
                if _match_test(nxt)[0]:
                    break
                range_m = RANGE_RE.match(nxt)
                if range_m and lo_raw is None:
                    lo_raw, hi_raw = range_m.group("lo"), range_m.group("hi")
                    j += 1
                    continue
                if VAL_RE.match(nxt) and val_raw is None:
                    val_raw = nxt
                    j += 1
                    continue
                if unit_raw is None and not range_m and not VAL_RE.match(nxt):
                    unit_raw = nxt
                    j += 1
                    continue
                j += 1
            if val_raw:
                code, _name, _syn, canon, conv, (plo, phi), _t = cat
                notes = []
                conf = 0.97
                if not exact:
                    conf = min(conf, 0.6)
                    notes.append("test_name_uncertain")
                if re.search(r"[OolI]", val_raw):
                    conf = min(conf, 0.55)
                    notes.append("ambiguous_characters")
                try:
                    val = float(val_raw.replace(",", "."))
                except ValueError:
                    val = None
                    conf = min(conf, 0.3)
                    notes.append("unparseable_value")
                unit, unit_changed = _norm_unit(unit_raw)
                if unit_changed:
                    conf = min(conf, 0.9)
                    notes.append("unit_normalized")
                if not unit:
                    conf = min(conf, 0.6)
                    notes.append("unit_missing")
                elif unit.lower() not in conv:
                    conf = min(conf, 0.6)
                    notes.append("unit_unrecognised")
                if val is not None and unit and unit.lower() in conv:
                    cv = val * conv[unit.lower()]
                    if not (plo <= cv <= phi):
                        conf = min(conf, 0.6)
                        notes.append("implausible_value")
                lo = float(lo_raw.replace(",", ".")) if lo_raw else None
                hi = float(hi_raw.replace(",", ".")) if hi_raw else None
                rows.append({"test_code": code, "test_name": test_name, "value_raw": val_raw, "value": val,
                             "unit": unit, "ref_low": lo, "ref_high": hi, "confidence": conf, "notes": notes,
                             "low_confidence": conf < OCR_CONFIDENCE_THRESHOLD})
                seen_codes.add(code)
                i = j
                continue
        i += 1

    # Pass 3: AI-powered extraction fallback if no rows matched
    if not rows and (settings.gemini_api_key or settings.anthropic_api_key):
        ai_candidates = _ai_extract_rows(text)
        for item in ai_candidates:
            tname = str(item.get("test_name") or "")
            cat, exact = _match_test(tname)
            if not cat or cat[0] in seen_codes:
                continue
            code, _name, _syn, canon, conv, (plo, phi), _t = cat
            val_raw = str(item.get("value_raw") or item.get("value") or "")
            if not val_raw:
                continue
            notes = ["ai_extracted"]
            conf = 0.95
            if not exact:
                conf = min(conf, 0.6)
                notes.append("test_name_uncertain")
            if re.search(r"[OolI]", val_raw):
                conf = min(conf, 0.55)
                notes.append("ambiguous_characters")
            try:
                val = float(val_raw.replace(",", "."))
            except ValueError:
                val = None
                conf = min(conf, 0.3)
                notes.append("unparseable_value")
            unit, unit_changed = _norm_unit(item.get("unit"))
            if not unit:
                conf = min(conf, 0.6)
                notes.append("unit_missing")
            elif unit.lower() not in conv:
                conf = min(conf, 0.6)
                notes.append("unit_unrecognised")
            if val is not None and unit and unit.lower() in conv:
                cv = val * conv[unit.lower()]
                if not (plo <= cv <= phi):
                    conf = min(conf, 0.6)
                    notes.append("implausible_value")
            lo = float(item["ref_low"]) if item.get("ref_low") is not None else None
            hi = float(item["ref_high"]) if item.get("ref_high") is not None else None
            rows.append({"test_code": code, "test_name": tname, "value_raw": val_raw, "value": val,
                         "unit": unit, "ref_low": lo, "ref_high": hi, "confidence": conf, "notes": notes,
                         "low_confidence": conf < OCR_CONFIDENCE_THRESHOLD})
            seen_codes.add(code)

    return {"observed_on": _norm_date(date.group(1)) if date else None,
            "lab_name": lab_name, "rows": rows, "unparsed_lines": unparsed[:20]}


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
