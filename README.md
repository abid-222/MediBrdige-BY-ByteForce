# MediBridge AI
> **AI assists. Doctors decide. Patients stay in control.**
Healthcare coordination prototype for Bangladesh (Dhaka, CBC + blood glucose) — built from `docs/blueprint.md` (M0–M15).
**All data is synthetic. This is not a medical device and gives no diagnosis, prescription or dose.**

## What's inside
| Path | What |
|---|---|
| `apps/api` | FastAPI backend: auth/OTP, consent + care-relationship access control, audit log, directory + provenance, report upload → parse → unverified observations, timeline/trends, SmartCare Navigator (red flags → gate → score), appointments state machine, clinical notes (draft/sign/addendum), facility portal, admin (verification, audit, break-glass), AI explain/summary/note-draft (Claude or source-only fallback), document-type ML classifier |
| `apps/web` | Next.js 14 + Tailwind: Midnight×Neon×Ivory tokens, dark/light, English + বাংলা, patient/doctor/hospital/admin screens, `/dev/ui` design-system page |
| `supabase/migrations` | Postgres SQL (generated from the models) + RLS, append-only audit trigger, pgvector |
| `data` | Synthetic directory (40 doctors, 10 facilities), specialties, classifier data |
| `docs` | Blueprint, architecture, safety gates, demo script |

## Run it (3 commands, no external services needed)
```bash
make setup            # pip + npm install, copies .env files
make seed             # demo data into local SQLite (idempotent)
make api              # terminal 1 → http://localhost:8000/docs
make web              # terminal 2 → http://localhost:3000
```
Demo logins (password `Demo@12345`): `patient1@demo.medibridge.dev`, `doctor1@…`, `hospital@…`, `admin@…`. Walk through `docs/DEMO_SCRIPT.md`.

New accounts: register → the 6-digit OTP is shown on screen in `APP_ENV=dev` (no email provider is wired).

## Quality checks
```bash
make test     # 91 backend tests (safety gates, security, OCR scans, email/storage/Claude integrations, full user journey)
make check    # i18n parity, TypeScript, lint, 17 frontend unit tests
```
## Postgres / Supabase
**Follow `docs/SUPABASE_SETUP.md`** and run `scripts/verify_deploy.py`.
Set `DATABASE_URL=postgresql+psycopg://…`, `pip install "psycopg[binary]"`, then either `alembic upgrade head` or run `supabase/migrations/0001…0003` in order. `docker compose up` starts Postgres + API + web.

## Optional
- **AI Clinical Explanations & Summaries:** set `GEMINI_API_KEY` (Google Gemini 3.5 Flash) and/or `ANTHROPIC_API_KEY` (Claude) in `.env` (server-side only). Without them, a deterministic source-only fallback is used.
- **Scanned (image) reports:** `pip install pytesseract pillow` + Tesseract binary. Digital PDFs work out of the box.
- **Retrain classifier:** `make train` (writes model, metrics, model card).

## Before any real-world use
Read `docs/SAFETY_GATES.md` → "Honest limits". Clinician review of red-flag rules and explainer text, real OCR validation on real reports, a security review, and legal/privacy sign-off are all required and NOT done here.

## Production checklist
See `docs/SECURITY.md` (known gaps) and `docs/AUDIT_REPORT.md`. Required env: `APP_ENV=production`, `JWT_SECRET` (32+ random chars), `DATABASE_URL` (Postgres), `CORS_ORIGINS` (explicit web origin); optional `ANTHROPIC_API_KEY`. The API refuses to start otherwise. Run `alembic upgrade head` then `python -m app.seed reference` (no demo users). Health: `/health`, `/health/ready`.
