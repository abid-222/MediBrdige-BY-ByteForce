import threading, time
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.core.config import Settings
from app.core.security import make_token
from app.models import AvailabilitySlot, Appointment, LoginAttempt
from tests.conftest import auth


def test_production_refuses_insecure_config():
    with pytest.raises(RuntimeError) as e:
        Settings(app_env="production", jwt_secret="dev-secret-change-me", database_url="sqlite:///x.db", cors_origins="*").validate_production()
    msg = str(e.value)
    assert "JWT_SECRET" in msg and "CORS_ORIGINS" in msg and "Postgres" in msg
    good = dict(app_env="production", jwt_secret="x" * 40, database_url="postgresql+psycopg://u:p@h/d", cors_origins="https://app.example.org",
                storage_backend="supabase", supabase_url="https://x.supabase.co", supabase_service_role_key="k")
    Settings(**good).validate_production()
    for bad, word in ((dict(storage_backend="local"), "STORAGE_BACKEND"), (dict(supabase_service_role_key=""), "SERVICE_ROLE"),
                      (dict(email_provider="resend"), "RESEND_API_KEY"), (dict(email_provider="smtp"), "SMTP_HOST")):
        with pytest.raises(RuntimeError, match=word):
            Settings(**{**good, **bad}).validate_production()


def test_otp_not_returned_outside_dev(client, monkeypatch):
    from app.core import config
    monkeypatch.setattr(config.settings, "app_env", "production")
    r = client.post("/api/v1/auth/register", json={"email": "prod@x.com", "password": "Passw0rd!"})
    assert "dev_otp" not in r.json()


def test_login_lockout_after_repeated_failures(client, make):
    make.user("v@x.com")
    for _ in range(5):
        assert client.post("/api/v1/auth/login", json={"email": "v@x.com", "password": "wrong-pass"}).status_code == 401
    r = client.post("/api/v1/auth/login", json={"email": "v@x.com", "password": "Passw0rd!"})   # even the right password is locked out
    assert r.status_code == 429 and r.json()["error"]["code"] == "too_many_attempts"
    # unknown emails are throttled identically (no enumeration)
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "ghost@x.com", "password": "nope-nope"})
    assert client.post("/api/v1/auth/login", json={"email": "ghost@x.com", "password": "nope-nope"}).status_code == 429


def test_logout_revokes_that_session_only(client, make):
    u = make.user("l@x.com")
    h1 = {"Authorization": "Bearer " + client.post("/api/v1/auth/login", json={"email": "l@x.com", "password": "Passw0rd!"}).json()["access_token"]}
    h2 = {"Authorization": "Bearer " + client.post("/api/v1/auth/login", json={"email": "l@x.com", "password": "Passw0rd!"}).json()["access_token"]}
    assert client.post("/api/v1/auth/logout", headers=h1).status_code == 200
    assert client.get("/api/v1/auth/me", headers=h1).json()["error"]["code"] == "session_ended"
    assert client.get("/api/v1/auth/me", headers=h2).status_code == 200


def test_tampered_expired_wrong_audience_tokens_rejected(client, make):
    import jwt, time as t
    from app.core.config import settings
    u = make.user("t@x.com")
    base = {"sub": u.id, "jti": "j1", "tv": 0, "iss": settings.jwt_issuer, "aud": settings.jwt_audience}
    good = jwt.encode({**base, "exp": int(t.time()) + 60}, settings.jwt_secret, algorithm="HS256")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {good}"}).status_code == 200
    for bad in (jwt.encode({**base, "exp": int(t.time()) - 5}, settings.jwt_secret, algorithm="HS256"),
                jwt.encode({**base, "aud": "someone-else", "exp": int(t.time()) + 60}, settings.jwt_secret, algorithm="HS256"),
                jwt.encode({**base, "exp": int(t.time()) + 60}, "other-secret-other-secret-other-secret", algorithm="HS256"),
                jwt.encode({**base, "exp": int(t.time()) + 60}, settings.jwt_secret, algorithm="HS256")[:-3] + "abc",
                jwt.encode({"sub": u.id, "exp": int(t.time()) + 60}, settings.jwt_secret, algorithm="HS256")):   # missing jti/iss/aud
        assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {bad}"}).status_code == 401


def test_password_reset_kills_existing_sessions(client, make):
    u = make.user("r@x.com")
    tok = client.post("/api/v1/auth/login", json={"email": "r@x.com", "password": "Passw0rd!"}).json()["access_token"]
    code = client.post("/api/v1/auth/forgot-password", json={"email": "r@x.com"}).json()["dev_otp"]
    assert client.post("/api/v1/auth/reset-password", json={"email": "r@x.com", "code": code, "new_password": "BrandNew#123"}).status_code == 200
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tok}"}).status_code == 401


def test_suspended_user_is_locked_out_immediately(client, make):
    admin, u = make.user("a@x.com", "super_admin"), make.user("s@x.com")
    h = {"Authorization": "Bearer " + client.post("/api/v1/auth/login", json={"email": "s@x.com", "password": "Passw0rd!"}).json()["access_token"]}
    assert client.patch(f"/api/v1/admin/users/{u.id}/status", headers=auth(admin), json={"status": "suspended", "reason": ""}).status_code == 400
    assert client.patch(f"/api/v1/admin/users/{u.id}/status", headers=auth(admin), json={"status": "suspended", "reason": "policy violation"}).status_code == 200
    assert client.get("/api/v1/auth/me", headers=h).status_code == 401


def test_concurrent_booking_of_same_slot_only_one_wins(make, db):
    from fastapi.testclient import TestClient
    from app.main import app
    f = make.facility(); d = make.doctor("d@x.com", facility=f)
    patients = [make.user(f"p{i}@x.com") for i in range(6)]
    slot = AvailabilitySlot(doctor_id=d.id, facility_id=f.id, start=datetime.now(timezone.utc) + timedelta(days=2), end=datetime.now(timezone.utc) + timedelta(days=2, minutes=20))
    db.add(slot); db.commit()
    results = []
    def go(p):
        c = TestClient(app)
        results.append(c.post("/api/v1/appointments", headers=auth(p), json={"doctor_id": d.id, "facility_id": f.id, "slot_id": slot.id}).status_code)
    ts = [threading.Thread(target=go, args=(p,)) for p in patients]
    [t.start() for t in ts]; [t.join() for t in ts]
    assert results.count(200) == 1 and results.count(409) == 5
    assert len(db.scalars(select(Appointment).where(Appointment.doctor_id == d.id)).all()) == 1


def test_db_unique_index_blocks_same_start_time(make, db, client):
    f = make.facility(); d = make.doctor("d@x.com", facility=f); p1, p2 = make.user("a@x.com"), make.user("b@x.com")
    body = {"doctor_id": d.id, "facility_id": f.id, "slot_start": "2026-12-05T10:00:00Z"}
    assert client.post("/api/v1/appointments", headers=auth(p1), json=body).status_code == 200
    assert client.post("/api/v1/appointments", headers=auth(p2), json=body).status_code == 409


def test_internal_errors_hide_details_and_carry_request_id(client, make, monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.modules.patients import router as pr
    u = make.user("e@x.com")
    monkeypatch.setattr(pr, "_profile_out", lambda *a, **k: 1 / 0)
    r = TestClient(app, raise_server_exceptions=False).get("/api/v1/patients/me", headers=auth(u))
    assert r.status_code == 500 and "division" not in r.text and "Traceback" not in r.text
    assert r.json()["error"]["details"]["request_id"]


def test_security_headers_present(client):
    h = client.get("/health").headers
    assert h["x-content-type-options"] == "nosniff" and h["cache-control"] == "no-store"


def test_readiness(client):
    assert client.get("/health/ready").json()["status"] == "ready"


def test_signed_file_link_is_owner_only_expires_and_frameable_by_web_origin(client, make, db, tmp_path):
    from app.seed import make_pdf, SAMPLE_GLU
    p, other = make.user("o@x.com"), make.user("n@x.com")
    f = tmp_path / "a.pdf"; make_pdf(SAMPLE_GLU.format(date="2026-10-02", v="98", u="mg/dL"), str(f))
    did = client.post("/api/v1/documents", headers=auth(p), files={"file": ("a.pdf", f.read_bytes(), "application/pdf")}).json()["id"]
    assert client.get(f"/api/v1/documents/{did}/file-url", headers=auth(other)).status_code == 403     # IDOR attempt
    url = client.get(f"/api/v1/documents/{did}/file-url", headers=auth(p)).json()["url"]
    r = client.get(url)
    assert r.status_code == 200 and r.content.startswith(b"%PDF") and "frame-ancestors" in r.headers["content-security-policy"] and "x-frame-options" not in r.headers
    assert client.get(url[:-4] + "xxxx").status_code == 403                                           # tampered token
    import jwt, time
    from app.core.config import settings
    expired = jwt.encode({"typ": "file", "doc": did, "exp": int(time.time()) - 1}, settings.jwt_secret, algorithm="HS256")
    assert client.get(f"/api/v1/files/{expired}").status_code == 403
    wrongtype = jwt.encode({"doc": did, "exp": int(time.time()) + 60}, settings.jwt_secret, algorithm="HS256")
    assert client.get(f"/api/v1/files/{wrongtype}").status_code == 403


def test_upload_rejects_fake_extension_and_path_traversal_name(client, make):
    p = make.user("u@x.com")
    r = client.post("/api/v1/documents", headers=auth(p), files={"file": ("../../etc/passwd.pdf", b"<html>x</html>", "application/pdf")})
    assert r.status_code == 415
    ok_pdf = b"%PDF-1.4\n%%EOF"
    r = client.post("/api/v1/documents", headers=auth(p), files={"file": ("../../evil.pdf", ok_pdf, "application/pdf")})
    assert r.status_code == 200      # stored under a server-generated name; the client filename is never used on disk
    import os
    from app.core.config import settings
    assert all(".." not in n and "evil" not in n for n in os.listdir(settings.upload_dir))


def test_corrupt_pdf_ends_failed_not_stuck_processing(client, make):
    p = make.user("c@x.com")
    did = client.post("/api/v1/documents", headers=auth(p), files={"file": ("x.pdf", b"%PDF-1.4\n%%EOF", "application/pdf")}).json()["id"]
    d = client.get(f"/api/v1/documents/{did}", headers=auth(p)).json()
    assert d["status"] == "failed" and "manual review" in d["message"]
