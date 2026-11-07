# Supabase + deployment setup (do these in order)
1. **Project** — https://supabase.com/dashboard → your project.
2. **Database URL** — Dashboard → *Connect* → **Session pooler**. In `apps/api/.env` set
   `DATABASE_URL=postgresql+psycopg://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres`
   (scheme must be `postgresql+psycopg://`; remove the `[ ]` placeholder brackets; URL-encode special characters in the password).
3. **Secret key** — Dashboard → Project Settings → API Keys → copy the **secret** key (`sb_secret_...`) into `SUPABASE_SERVICE_ROLE_KEY`. The *publishable* key is not enough: private bucket writes need the secret key, and it must stay server-side.
4. **Bucket** — Dashboard → Storage → New bucket → name `reports` → **Private**.
5. **Create tables + security** (pick ONE; results are identical):
   - `cd apps/api && alembic upgrade head`   (creates tables, RLS, audit trigger, pgvector), or
   - paste `supabase/migrations/0001_extensions.sql`, `0002_core.sql`, `0003_security.sql` into the Supabase SQL editor, in that order.
6. **Reference data** — `cd apps/api && python -m app.seed reference` (specialties, lab catalogue, knowledge base; no demo users).
7. **Check everything** — `cd apps/api && python ../../scripts/verify_deploy.py --send-email you@example.com` → every line must say PASS.
8. **Run** — `uvicorn app.main:app --host 0.0.0.0 --port 8000` (API), `npm run build && npm start` in `apps/web` with `NEXT_PUBLIC_API_URL=https://<api-domain>/api/v1`.

Notes
- Email: with `EMAIL_PROVIDER=resend` and the default `onboarding@resend.dev` sender, Resend only delivers to your own Resend account address. To email real patients, verify a domain in Resend and change `EMAIL_FROM`.
- Anthropic: the API needs prepaid credit (Console → Billing). Without it the app uses the source-only fallback automatically.
- Rotate any key that was ever pasted into a chat or committed to git.
- Tesseract (scanned images) must be installed on the API server: `apt-get install tesseract-ocr` (the Docker image should add it).
