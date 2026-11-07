# Security notes
**Implemented (tested in `apps/api/tests`):**
- JWT with `iss`, `aud`, `jti`, expiry and per-user `token_version`; missing/foreign claims are rejected. Logout blacklists the session's `jti` server-side; password reset and admin suspension invalidate every session at once.
- Brute-force lockout (5 failures / 15 min, applied equally to unknown emails, so no account enumeration). OTP: hashed, 10-min expiry, 5 attempts, 3 resends/hour, constant-time compare; **OTP is returned only when `APP_ENV=dev`**.
- Production boot refuses insecure config (`JWT_SECRET` under 32 chars or default, `CORS_ORIGINS=*`, SQLite): `app/core/config.py::validate_production`.
- Every clinical read/write goes through `core/access.py` (role + ownership + active care relationship + unexpired consent + scope), audited on allow **and** deny. IDOR tests for documents, observations, notes, files.
- Uploads: magic-byte sniffing (client MIME/filename ignored), 10 MB cap, 30-page PDF cap, server-generated filenames (no traversal), signed 5-minute file URLs bound to `typ=file`, corrupt files end as `failed` (never stuck).
- Appointments: atomic slot claim (`UPDATE ... WHERE booked < capacity`) + partial unique index (`uq_active_doctor_slot`) + idempotency keys; tested with concurrent threads.
- Errors: user-safe messages, request id returned, full traceback only in server logs (JSON). Security headers + `Cache-Control: no-store`.

**Known gaps / decisions you should make before real use**
1. **Session storage.** The token is in `sessionStorage` (tab-scoped, revoked on logout), not an httpOnly cookie. A cookie session needs web app and API on the same site (or `SameSite=None; Secure`) plus CSRF tokens; it was not switched because it would break the current two-origin setup. For production: serve both behind one domain, then move to httpOnly cookies + CSRF.
2. **Rate limiting** is per-account (DB-based). No per-IP/global limiter; put the API behind a reverse proxy/WAF.
3. **Postgres RLS** is deny-by-default and was tested on a real PostgreSQL 16 (anon blocked, authenticated limited to own rows, audit log immutable). It has **not** been run on your actual Supabase project: run `scripts/verify_deploy.py` there. The API connects with a privileged role that bypasses RLS, so RLS is defence-in-depth only; the real checks are in `core/access.py`.
4. No MFA, no email delivery (OTP is dev-only until an email provider is wired), no virus scanning of uploads, no encryption at rest beyond your DB/storage provider.
5. Clinical content (red-flag rules, lab explanations) needs clinician review; legal/privacy review is not done.
