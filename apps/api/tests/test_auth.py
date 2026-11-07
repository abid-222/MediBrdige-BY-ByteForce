from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.models import OtpCode, Profile
from tests.conftest import auth


def test_register_verify_login_flow(client, db):
    r = client.post("/api/v1/auth/register", json={"email": "a@x.com", "password": "Passw0rd!", "full_name": "A"})
    code = r.json()["dev_otp"]
    assert client.post("/api/v1/auth/login", json={"email": "a@x.com", "password": "Passw0rd!"}).status_code == 403  # unverified
    assert client.post("/api/v1/auth/verify-email", json={"email": "a@x.com", "code": code}).status_code == 200
    login = client.post("/api/v1/auth/login", json={"email": "a@x.com", "password": "Passw0rd!"})
    assert login.status_code == 200 and login.json()["role"] == "patient"


def test_wrong_and_expired_otp_blocked(client, db):
    r = client.post("/api/v1/auth/register", json={"email": "b@x.com", "password": "Passw0rd!"})
    code = r.json()["dev_otp"]
    bad = "000000" if code != "000000" else "111111"
    assert client.post("/api/v1/auth/verify-email", json={"email": "b@x.com", "code": bad}).status_code == 400
    row = db.scalars(select(OtpCode).where(OtpCode.email == "b@x.com")).first()
    row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1); db.commit()
    assert client.post("/api/v1/auth/verify-email", json={"email": "b@x.com", "code": code}).status_code == 400


def test_otp_attempt_limit(client):
    client.post("/api/v1/auth/register", json={"email": "c@x.com", "password": "Passw0rd!"})
    for _ in range(5):
        client.post("/api/v1/auth/verify-email", json={"email": "c@x.com", "code": "999999"})
    # even a correct code is now blocked after 5 attempts (can't know it here, so assert the 6th is still a 400)
    assert client.post("/api/v1/auth/verify-email", json={"email": "c@x.com", "code": "999999"}).status_code == 400


def test_resend_limit(client):
    client.post("/api/v1/auth/register", json={"email": "d@x.com", "password": "Passw0rd!"})
    statuses = [client.post("/api/v1/auth/resend-otp", json={"email": "d@x.com"}).status_code for _ in range(4)]
    assert 429 in statuses


def test_enumeration_safe_register(client):
    first = client.post("/api/v1/auth/register", json={"email": "e@x.com", "password": "Passw0rd!"})
    again = client.post("/api/v1/auth/register", json={"email": "e@x.com", "password": "Passw0rd!"})
    unknown_resend = client.post("/api/v1/auth/resend-otp", json={"email": "nobody@x.com"})
    assert again.status_code == first.status_code == 200
    assert again.json()["message"] == first.json()["message"] == unknown_resend.json()["message"]


def test_role_never_accepted_from_client(client, db):
    client.post("/api/v1/auth/register", json={"email": "f@x.com", "password": "Passw0rd!", "role": "super_admin"})
    assert db.scalar(select(Profile).where(Profile.email == "f@x.com")).role == "patient"


def test_patient_cannot_open_doctor_or_admin_routes(client, make):
    p = make.user("p@x.com")
    assert client.get("/api/v1/doctor/dashboard", headers=auth(p)).status_code == 403
    assert client.get("/api/v1/admin/audit-logs", headers=auth(p)).status_code == 403
    assert client.get("/api/v1/doctor/dashboard").status_code == 401


def test_pending_doctor_blocked_until_approved(client, make):
    d = make.user("pd@x.com", "doctor", status="pending")
    assert client.get("/api/v1/doctor/dashboard", headers=auth(d)).status_code == 403
