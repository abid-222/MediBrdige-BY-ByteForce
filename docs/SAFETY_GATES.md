# Safety gates → where they are enforced and tested
| Gate | Rule | Code | Tests |
|---|---|---|---|
| G1 OCR | Unit never inferred; ambiguous chars/implausible values flagged <0.85; corrections audited | `modules/documents/service.py` | `test_gate_ocr_ai.py` |
| G2 AI | Source-bound JSON; no source ⇒ "Information not found"; document text is data; unsigned notes hidden | `modules/ai/service.py`, `modules/notes` | `test_gate_ocr_ai.py` |
| G3 Navigator | Red flags first; emergency beats budget; clinical gate before price | `modules/navigator/service.py` | `test_gate_navigator_directory.py` |
| G4 Privacy | Role + owner + care relationship + consent + scope; deny is audited; break-glass alerts patient | `core/access.py` | `test_gate_access.py` |
| G5 Directory | "Verified" only with admin evidence; stale >90d; unknown fee = "Not confirmed" | `modules/directory`, `modules/admin` | `test_gate_navigator_directory.py`, `test_workflows.py` |
| G6 Scope | Dhaka only; CBC + glucose only; clear "not supported yet" | `core/config.py`, navigator, documents | same |

## Honest limits (read before any real use)
- Red-flag rules and the lab explainer text are **seed content that a clinician must review** before production.
- The document-type classifier is trained on template-generated synthetic text; its ~1.0 F1 only shows the pipeline works.
- OCR for scans needs `pytesseract`/`paddleocr` installed; without it, scanned files fail with a clear message (digital PDFs work).
- No real patient data, no real payments, no real SMS/email delivery (OTP is shown in `dev` mode only).
