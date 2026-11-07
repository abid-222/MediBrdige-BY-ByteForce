"""Real Tesseract OCR on rendered scans (skipped if the tesseract binary is not installed)."""
import random, shutil
import pytest
from tests.conftest import auth

pytestmark = pytest.mark.skipif(shutil.which("tesseract") is None, reason="tesseract not installed")
LINES = ["Laboratory: Sample Diagnostic Lab (SYNTHETIC)", "Date: 2026-10-02", "Complete Blood Count (CBC)",
         "Hemoglobin 13.5 g/dL 12.0 - 16.0", "WBC 6.8 10^9/L 4.0 - 11.0", "Platelet 255 10^9/L 150 - 450"]
TRUTH = {"HGB": 13.5, "WBC": 6.8, "PLT": 255.0}


def _scan(path, blur=0.0, noise=0):
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    random.seed(3)
    img = Image.new("L", (1000, 420), 255); d = ImageDraw.Draw(img)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    for i, l in enumerate(LINES):
        d.text((40, 30 + i * 55), l, fill=0, font=f)
    if blur: img = img.filter(ImageFilter.GaussianBlur(blur))
    px = img.load()
    for _ in range(noise):
        px[random.randrange(img.width), random.randrange(img.height)] = random.choice([0, 255])
    img.convert("RGB").save(path)


def _run(client, patient, path):
    did = client.post("/api/v1/documents", headers=auth(patient), files={"file": ("s.png", open(path, "rb").read(), "image/png")}).json()["id"]
    return client.get(f"/api/v1/documents/{did}/extractions", headers=auth(patient)).json(), client.get(f"/api/v1/documents/{did}", headers=auth(patient)).json()


def test_clean_scan_values_correct_and_nothing_auto_verified(client, make, tmp_path):
    p = make.user("s@x.com"); f = tmp_path / "c.png"; _scan(str(f))
    ex, doc = _run(client, p, str(f))
    assert doc["status"] == "processed"
    got = {r["test_code"]: r for r in ex["rows"]}
    assert float(got["HGB"]["value"]) == 13.5 and got["HGB"]["unit"] == "g/dL" and not got["HGB"]["low_confidence"]
    for code, r in got.items():
        assert float(r["value"]) == TRUTH[code]            # no wrong number slips through
        assert r["status"] == "unverified"                 # OCR output is never verified automatically
    assert got["PLT"]["unit"] == "10^9/L"                  # '*'/'%' glyph confusion normalised deterministically


def test_degraded_scan_never_yields_confident_wrong_values(client, make, tmp_path):
    p = make.user("d@x.com"); f = tmp_path / "b.png"; _scan(str(f), blur=2.4, noise=6000)
    ex, doc = _run(client, p, str(f))
    assert doc["status"] in ("processed", "failed")
    for r in ex["rows"]:
        if not r["low_confidence"]:
            assert float(r["value"]) == TRUTH[r["test_code"]]   # anything not flagged must be correct
    if doc["status"] == "failed":
        assert "Manual review" in doc["message"]


def test_name_misread_is_flagged_not_silently_accepted():
    from app.modules.documents import service as s
    rows = {r["test_code"]: r for r in s.parse_report("Date: 2026-10-02\nWEC 6.8 10^9/L 4.0 - 11.0\n")["rows"]}
    assert rows["WBC"]["low_confidence"] and "test_name_uncertain" in rows["WBC"]["notes"]
    assert s.parse_report("Date: 2026-10-02\nQXZ 6.8 10^9/L\n")["rows"] == []     # unknown names are not guessed
