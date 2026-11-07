# Architecture
```
apps/web   Next.js 14 (App Router, TS, Tailwind tokens)   ── fetch ──▶  apps/api  FastAPI
                                                                          ├─ core/      config, db, errors, security, audit, access (the gatekeeper)
                                                                          ├─ modules/   auth access patients directory documents observations
                                                                          │             navigator appointments notes facility admin ai ml
                                                                          └─ models.py  40 tables  ──▶ SQLite (dev/tests) | Postgres/Supabase
supabase/migrations  0001 extensions · 0002 core (generated from models) · 0003 RLS, append-only audit, pgvector
```
- **Single decision point:** every clinical read/write calls `core.access.require_access`, which logs allow *and* deny.
- **Ids** are UUID strings (`varchar(36)`) so one model set runs on SQLite and Postgres; `scripts/gen_sql.py` regenerates the SQL so it can't drift.
- **Auth:** built-in email+OTP fallback with JWT. To use Supabase Auth instead, make `profiles.id` equal `auth.users.id` and replace `core/security.get_current_user`.
- **AI:** `modules/ai/service.py` calls Claude server-side only when `ANTHROPIC_API_KEY` is set; otherwise a deterministic, source-only fallback runs. Output is validated and source-less claims are dropped.
- **Deviations from the blueprint** (deliberate, to keep it runnable anywhere): custom cookie-based i18n instead of `next-intl` URL prefixes; shadcn/ui replaced by small hand-written components in `components/ui.tsx`; ids are varchar not native uuid; pgvector column added by migration 0003 (MVP retrieval is by `test_code`).
