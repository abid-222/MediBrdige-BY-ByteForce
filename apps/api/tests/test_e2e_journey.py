"""One continuous journey through the real HTTP API, every role (the closest we can get to E2E without a browser)."""
import re
from sqlalchemy import select
from app.models import DoctorProfile, Profile
from app.seed import SAMPLE_CBC, make_pdf
from tests.conftest import auth


def _login(client, email, pw="Passw0rd!"):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": pw}); assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_full_journey(client, make, db, tmp_path):
    # --- patient registers, verifies by OTP, logs in, finishes onboarding
    reg = client.post("/api/v1/auth/register", json={"email": "journey@x.com", "password": "Passw0rd!", "full_name": "Journey Patient"}).json()
    assert client.post("/api/v1/auth/verify-email", json={"email": "journey@x.com", "code": reg["dev_otp"]}).status_code == 200
    P = _login(client, "journey@x.com")
    assert client.get("/api/v1/patients/me/dashboard", headers=P).json()["error"]["code"] == "onboarding_required"
    assert client.put("/api/v1/patients/me", headers=P, json={"full_name": "Journey Patient", "district": "Dhaka", "onboarding_completed": True}).status_code == 200
    patient_id = client.get("/api/v1/auth/me", headers=P).json()["id"]
    assert client.get("/api/v1/patients/me/dashboard", headers=P).status_code == 200

    # --- uploads a CBC, values extracted but unverified
    f = tmp_path / "cbc.pdf"; make_pdf(SAMPLE_CBC.format(date="2026-10-02", hb="13.5", wbc="6.8", plt="255"), str(f))
    doc = client.post("/api/v1/documents", headers=P, files={"file": ("cbc.pdf", f.read_bytes(), "application/pdf")}).json()["id"]
    ex = client.get(f"/api/v1/documents/{doc}/extractions", headers=P).json()
    assert ex["document_status"] == "processed" and all(r["status"] == "unverified" for r in ex["rows"])

    # --- navigator: emergency wins, otherwise a verified doctor is offered
    fac = make.facility(); d_user = make.doctor("jdoc@x.com", specialty="hematology", facility=fac, name="Dr Journey")
    assert client.post("/api/v1/navigator/matches", headers=P, json={"text": "severe chest pain and shortness of breath"}).json()["emergency"] is True
    nav = client.post("/api/v1/navigator/matches", headers=P, json={"text": "anemia low hemoglobin"}).json()
    assert any(c["doctor_name"] == "Dr Journey" for c in nav["eligible"] + nav["needs_review"])

    # --- books, sharing the report; doctor cannot see it yet
    D = _login(client, "jdoc@x.com")
    appt = client.post("/api/v1/appointments", headers={**P, "Idempotency-Key": "j1"}, json={"doctor_id": d_user.id, "facility_id": fac.id, "slot_start": "2026-12-10T10:00:00Z", "share_opt_in": True, "share_document_ids": [doc]}).json()
    assert client.get(f"/api/v1/documents/{doc}", headers=D).status_code == 403

    # --- doctor confirms -> consent + care relationship appear -> doctor verifies a value, writes and signs a note
    assert client.patch(f"/api/v1/appointments/{appt['id']}/status", headers=D, json={"status": "confirmed"}).status_code == 200
    assert client.get(f"/api/v1/documents/{doc}", headers=D).status_code == 200
    oid = client.get(f"/api/v1/documents/{doc}/extractions", headers=D).json()["rows"][0]["observation_id"]
    assert client.post(f"/api/v1/observations/{oid}/verify", headers=D).json()["status"] == "doctor_verified"
    note = client.post("/api/v1/clinical-notes/draft", headers=D, json={"patient_id": patient_id, "text": "Reviewed CBC."}).json()
    assert client.get("/api/v1/patients/me/notes", headers=P).json()["items"] == []
    assert client.post(f"/api/v1/clinical-notes/{note['id']}/sign", headers=D).status_code == 200
    assert len(client.get("/api/v1/patients/me/notes", headers=P).json()["items"]) == 1

    # --- patient sees the doctor's access, revokes, doctor is locked out immediately
    log = client.get("/api/v1/patients/me/access-log", headers=P).json()["items"]
    assert any(i["actor_role"] == "doctor" and i["result"] == "allow" for i in log)
    for c in client.get("/api/v1/consents", headers=P).json()["items"]:
        client.post(f"/api/v1/consents/{c['id']}/revoke", headers=P)
    assert client.get(f"/api/v1/documents/{doc}", headers=D).status_code == 403
    assert client.get(f"/api/v1/doctor/patients/{patient_id}", headers=D).status_code == 403

    # --- admin verifies a doctor (needs evidence), sees the denied access in the audit log, patient logs out
    admin = make.user("jadmin@x.com", "super_admin"); A = auth(admin)
    pending = make.doctor("pend@x.com", verification="unverified")
    assert client.patch(f"/api/v1/admin/doctors/{pending.id}/verify", headers=A, json={"decision": "approve", "reason": "BMDC checked", "evidence": []}).status_code == 400
    assert client.patch(f"/api/v1/admin/doctors/{pending.id}/verify", headers=A, json={"decision": "approve", "reason": "BMDC checked", "evidence": ["bmdc.pdf"]}).status_code == 200
    logs = client.get("/api/v1/admin/audit-logs?result=deny", headers=A).json()["items"]
    assert any(l["actor_role"] == "doctor" for l in logs)
    assert client.post("/api/v1/auth/logout", headers=P).status_code == 200 and client.get("/api/v1/auth/me", headers=P).status_code == 401
