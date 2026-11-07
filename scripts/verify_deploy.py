"""Run this on YOUR machine after filling apps/api/.env:   cd apps/api && python ../../scripts/verify_deploy.py [--send-email you@example.com]
Checks every external dependency and prints PASS/FAIL per item. Secrets are never printed."""
import os, sys, time, uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))
import httpx
from sqlalchemy import create_engine, text
from app.core.config import settings

ok_all = True
def report(name, ok, detail=""):
    global ok_all; ok_all &= ok
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))

# 1. configuration
try: settings.validate_production(); report("production config rules", True)
except RuntimeError as e: report("production config rules", False, str(e)) if settings.app_env != "dev" else report("config (dev mode: production rules skipped)", True)
report("JWT_SECRET strength", len(settings.jwt_secret) >= 32 and settings.jwt_secret != "dev-secret-change-me", f"{len(settings.jwt_secret)} chars")

# 2. database + migrations + RLS
try:
    eng = create_engine(settings.database_url, pool_pre_ping=True)
    with eng.connect() as c:
        v = c.execute(text("select version()")).scalar().split(",")[0]
        report("database connection", True, v)
        tables = {r[0] for r in c.execute(text("select table_name from information_schema.tables where table_schema='public'"))}
        need = {"profiles", "consents", "audit_logs", "documents", "observations", "appointments", "revoked_tokens", "login_attempts"}
        report("migrations applied", need <= tables, f"{len(tables)} tables" + ("" if need <= tables else f"; missing {sorted(need - tables)}"))
        if "audit_logs" in tables and v.startswith("PostgreSQL"):
            rls = c.execute(text("select count(*) from pg_class where relrowsecurity and relnamespace='public'::regnamespace")).scalar()
            report("row level security enabled", rls >= 20, f"{rls} tables")
            trg = c.execute(text("select count(*) from pg_trigger where tgname='audit_logs_no_update'")).scalar()
            report("audit_logs append-only trigger", trg == 1)
            ext = c.execute(text("select count(*) from pg_extension where extname='vector'")).scalar()
            report("pgvector extension", ext == 1)
except Exception as e:
    report("database connection", False, type(e).__name__ + ": " + str(e).split("\n")[0][:160].replace(settings.database_url, "<url>"))

# 3. storage
if settings.storage_backend == "supabase":
    try:
        from app.core import storage
        key = f"_verify/{uuid.uuid4()}"
        storage.put(key, b"%PDF-1.4 verify", "application/pdf")
        back = storage.read(f"sb:{key}")
        httpx.request("DELETE", f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{key}", headers={"Authorization": f"Bearer {settings.supabase_service_role_key}", "apikey": settings.supabase_service_role_key}, timeout=20)
        report("supabase storage write/read/delete", back.startswith(b"%PDF"))
    except Exception as e:
        report("supabase storage write/read/delete", False, str(e)[:160])
else:
    report("storage backend", True, f"{settings.storage_backend} (not Supabase)")

# 4. Anthropic
if settings.anthropic_api_key:
    try:
        r = httpx.post("https://api.anthropic.com/v1/messages", timeout=30, headers={"x-api-key": settings.anthropic_api_key, "anthropic-version": "2023-06-01"},
                       json={"model": settings.anthropic_model, "max_tokens": 10, "messages": [{"role": "user", "content": "Say OK"}]})
        report("anthropic api", r.status_code == 200, "ok" if r.status_code == 200 else r.json().get("error", {}).get("message", str(r.status_code))[:140])
    except Exception as e: report("anthropic api", False, str(e)[:120])
else: report("anthropic api", True, "no key set: AI uses the source-only fallback")

# 5. email
if "--send-email" in sys.argv:
    from app.core.email import send_email
    to = sys.argv[sys.argv.index("--send-email") + 1]
    report(f"email via {settings.email_provider}", send_email(to, "MediBridge test", "This is a MediBridge deployment test email."), f"sent to {to}")
else:
    report("email provider", settings.email_provider != "none" or settings.app_env == "dev", f"{settings.email_provider} (run with --send-email you@example.com to really send)")
print("\nALL CHECKS PASSED" if ok_all else "\nSOME CHECKS FAILED: fix the FAIL lines above and run again")
sys.exit(0 if ok_all else 1)
