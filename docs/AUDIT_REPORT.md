# Audit & hardening report
## Baseline (before changes)
63 backend tests passed; frontend type-check and build passed; lint: 1 warning. Problems found by code review (the tests did not catch them):
| # | Problem | Fixed in |
|---|---|---|
| 1 | Unhandled 500s were swallowed, nothing logged | `core/errors.py`, `core/logging_setup.py` |
| 2 | Corrupt PDF (valid header) crashed the pipeline, document stuck "processing" | `documents/service.py` |
| 3 | Slot booking was read-then-write (double-booking race) | `appointments/router.py`, unique index, Alembic 0002 |
| 4 | No login throttling; sessions not revocable; JWT without iss/aud/jti | `auth/router.py`, `core/security.py` |
| 5 | Production could boot with default JWT secret / `*` CORS / SQLite | `core/config.py` |
| 6 | OTP compared with `==` (timing) | `core/security.py::otp_matches` |
| 7 | API client: no timeout/cancel, raw server messages, bad JSON unhandled | `web/lib/api.ts` |
| 8 | `useApi`: stale responses could overwrite newer data | `web/lib/useApi.ts` |
| 9 | `fmtDate` sliced strings; UTC/invalid dates could mis-render or shift a day | `web/lib/format.ts` |
| 10 | `confirm()` for note signing (not accessible) | `Dialog` in `components/ui.tsx` |
| 11 | Trend warning for unreadable values said "unit incompatible" | `observations/router.py` |
| 12 | Production startup used `create_all` | dev-only now; Alembic + `python -m app.seed reference` |
| 13 | Report preview iframe would have been blocked by `X-Frame-Options` | `main.py` (frame-ancestors for file route) |

## Frontend
Light ivory/white + medical-green design system (dark optional), Lucide icons, responsive sidebar + mobile bottom nav, skip link, accessible dialog, loading/empty/error states. Rebuilt: patient dashboard (real counts, snapshot, notifications, access activity), doctor dashboard (Asia/Dhaka "today", patient search), admin (system health, verification queue, users with suspend/reactivate, audit + CSV, directory quality), facility, appointments, report center (drag-drop, upload progress, original-file viewer via signed URL, searchable extracted text with highlight; four separated layers: uploaded / OCR / AI / doctor-verified; honest status chips).
**Not done:** directory, navigator, timeline, consent and auth screens only picked up the new theme/components, their layouts were not redesigned; no bounding-box highlighting of source locations (parser stores no coordinates); no browser/component/E2E tests (no browser in this environment).

## Tests actually run
- Backend `pytest`: **78 passed** (63 original + 15 new).
- Frontend `vitest`: **17 passed**; `tsc` clean; `next lint` 0 warnings; `next build` OK; i18n parity (253 keys).
- Live smoke (uvicorn + `next start`): CORS preflight OK, 9 pages return 200, signed PDF URL serves `application/pdf`, logout invalidates token.
## Not run
Postgres (RLS, migration 0003, concurrency); Alembic 0002 only on fresh SQLite; Claude API (no key); OCR for scans (no Tesseract); browser E2E; accessibility audit tools.

## Round 2 (integration + real-environment testing)
| Finding | Fix |
|---|---|
| Real Tesseract reads `10^9/L` as `10*9/L` / `10%9/L`, so WBC/Platelet rows were silently dropped | deterministic glyph normalisation, flagged `unit_normalized` (0.9 confidence) |
| OCR misread of a test name (`WEC` for `WBC`) dropped the row | fuzzy match (edit distance), always flagged `test_name_uncertain` and low-confidence; unknown names are never guessed; unparsed test lines are listed for the reviewer |
| Preprocessing hurt very noisy scans | OCR both raw and preprocessed, keep the text with more recognised rows |
| Alembic path did not apply RLS / audit trigger / pgvector (found by `verify_deploy.py`) | Alembic revision 0003 runs the same SQL as the Supabase files; SQL made safe on plain Postgres |
| Uploads to local disk would vanish on redeploy | private Supabase Storage backend (service key server-side only), production refuses `local` unless explicitly allowed |
| OTP never actually emailed | Resend + SMTP providers; failures are logged without the body and never revealed to the user |
| Small pool needed for Supabase poolers | `pool_pre_ping`, pool_size 5 |

**Tested for real:** full suite on SQLite and on PostgreSQL 16 (91/91 each, incl. concurrent booking); Alembic `upgrade head` on empty Postgres; RLS behaviour (anon blocked, authenticated sees only own rows, audit_logs UPDATE raises); real Tesseract on clean and degraded scans; live uvicorn+Postgres upload→OCR→AI-fallback; `verify_deploy.py` all PASS locally.
**Could not test from this environment (no network to them):** your actual Supabase project, Supabase Storage, Resend, and Claude generation (the supplied Anthropic key authenticated but the account has no credit, so only the request format/validation/fallback paths were tested with fakes). No browser available for Playwright; the user journey is covered at API level (`tests/test_e2e_journey.py`).
