from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.models import AuditLog, AvailabilitySlot, Consent, FacilityPrice, Observation, VerificationCase
from tests.conftest import auth


def _appt(client, p, d, f, **kw):
    return client.post("/api/v1/appointments", headers=auth(p), json={"doctor_id": d.id, "facility_id": f.id, **kw})


def test_appointment_state_machine_and_effects(client, make, db):
    f = make.facility()
    p, d = make.user("p@x.com"), make.doctor("d@x.com", facility=f)
    a = _appt(client, p, d, f, slot_start="2026-12-01T10:00:00Z", share_opt_in=True, share_document_ids=[]).json()
    assert a["status"] == "requested"
    h = auth(d)
    ok = client.patch(f"/api/v1/appointments/{a['id']}/status", headers=h, json={"status": "confirmed"})
    assert ok.status_code == 200
    # confirm created a relationship + time-limited consent (because patient opted in)
    c = db.scalars(select(Consent).where(Consent.patient_id == p.id)).all()
    assert c and c[0].expires_at is not None and c[0].grantee_id == d.id
    assert client.get(f"/api/v1/doctor/patients/{p.id}", headers=h).status_code == 200
    # illegal transitions -> 409
    assert client.patch(f"/api/v1/appointments/{a['id']}/status", headers=h, json={"status": "completed"}).status_code == 409
    assert client.patch(f"/api/v1/appointments/{a['id']}/status", headers=h, json={"status": "checked_in"}).status_code == 200
    assert client.patch(f"/api/v1/appointments/{a['id']}/status", headers=h, json={"status": "cancelled"}).status_code == 409
    assert client.patch(f"/api/v1/appointments/{a['id']}/status", headers=h, json={"status": "completed"}).status_code == 200
    # same status visible from all three ends
    f_admin = make.user("fa@x.com", "facility_admin", facility_id=f.id)
    for u in (p, d, f_admin):
        assert client.get("/api/v1/appointments", headers=auth(u)).json()["items"][0]["status"] == "completed"


def test_no_share_without_opt_in(client, make, db):
    f = make.facility()
    p, d = make.user("p@x.com"), make.doctor("d@x.com", facility=f)
    a = _appt(client, p, d, f, slot_start="2026-12-01T10:00:00Z", share_opt_in=False).json()
    client.patch(f"/api/v1/appointments/{a['id']}/status", headers=auth(d), json={"status": "confirmed"})
    assert db.scalars(select(Consent).where(Consent.patient_id == p.id)).all() == []
    assert client.get(f"/api/v1/doctor/patients/{p.id}", headers=auth(d)).status_code == 403   # relationship alone isn't consent


def test_double_booking_blocked_and_idempotent(client, make, db):
    f = make.facility()
    p, p2, d = make.user("p@x.com"), make.user("p2@x.com"), make.doctor("d@x.com", facility=f)
    slot = AvailabilitySlot(doctor_id=d.id, facility_id=f.id, start=datetime.now(timezone.utc) + timedelta(days=2),
                            end=datetime.now(timezone.utc) + timedelta(days=2, minutes=20))
    db.add(slot); db.commit()
    h = {**auth(p), "Idempotency-Key": "abc"}
    body = {"doctor_id": d.id, "facility_id": f.id, "slot_id": slot.id}
    r1 = client.post("/api/v1/appointments", headers=h, json=body).json()
    r2 = client.post("/api/v1/appointments", headers=h, json=body).json()
    assert r1["id"] == r2["id"]
    assert client.post("/api/v1/appointments", headers=auth(p2), json=body).status_code == 409


def test_patient_can_only_cancel_and_other_facility_blocked(client, make):
    f1, f2 = make.facility("A"), make.facility("B")
    p, d = make.user("p@x.com"), make.doctor("d@x.com", facility=f1)
    a = _appt(client, p, d, f1, slot_start="2026-12-02T10:00:00Z").json()
    assert client.patch(f"/api/v1/appointments/{a['id']}/status", headers=auth(p), json={"status": "confirmed"}).status_code == 403
    other = make.user("fb@x.com", "facility_admin", facility_id=f2.id)
    assert client.patch(f"/api/v1/appointments/{a['id']}/status", headers=auth(other), json={"status": "confirmed"}).status_code == 403
    assert client.patch(f"/api/v1/appointments/{a['id']}/status", headers=auth(p), json={"status": "cancelled"}).status_code == 200


def test_staff_see_minimum_patient_data(client, make):
    f = make.facility()
    p, d = make.user("p@x.com"), make.doctor("d@x.com", facility=f)
    _appt(client, p, d, f, slot_start="2026-12-02T10:00:00Z", reason="private reason")
    staff = make.user("s@x.com", "facility_staff", facility_id=f.id)
    item = client.get("/api/v1/appointments", headers=auth(staff)).json()["items"][0]
    assert "reason" not in item


# ---------- timeline ----------
def _obs(db, p, date, v, unit="g/dL", lo=12.0, hi=16.0):
    o = Observation(patient_id=p.id, test_code="HGB", value_num=v, value_raw=str(v), unit=unit, ref_low=lo, ref_high=hi, observed_on=date)
    db.add(o); db.commit()


def test_timeline_neutral_wording_and_unit_conversion(client, make, db):
    p = make.user("p@x.com")
    from app.seed import seed_reference; seed_reference(db)
    _obs(db, p, "2026-01-01", 120, unit="g/L", lo=120, hi=160)
    _obs(db, p, "2026-06-01", 13.5)
    r = client.get("/api/v1/observations/trends?test_code=HGB", headers=auth(p)).json()
    assert [pt["value"] for pt in r["points"]] == [12.0, 13.5]
    assert r["change"]["text_en"] == "Value changed from 12.0 to 13.5 g/dL"
    assert r["change"]["text_bn"].startswith("মান 12.0 থেকে 13.5")
    low = str(r).lower()
    assert "improved" not in low and "worsened" not in low


def test_incompatible_units_not_on_one_line_and_single_point_ok(client, make, db):
    p = make.user("p@x.com")
    _obs(db, p, "2026-01-01", 13.0)
    one = client.get("/api/v1/observations/trends?test_code=HGB", headers=auth(p)).json()
    assert len(one["points"]) == 1 and one["change"] is None
    _obs(db, p, "2026-02-01", 13.0, unit="mmol/L")
    r = client.get("/api/v1/observations/trends?test_code=HGB", headers=auth(p)).json()
    assert len(r["points"]) == 1 and r["warnings"][0]["code"] == "unit_incompatible"


def test_each_point_keeps_own_reference_range(client, make, db):
    p = make.user("p@x.com")
    _obs(db, p, "2026-01-01", 13.0, lo=12.0, hi=16.0)
    _obs(db, p, "2026-02-01", 13.0, lo=11.5, hi=15.5)
    pts = client.get("/api/v1/observations/trends?test_code=HGB", headers=auth(p)).json()["points"]
    assert (pts[0]["ref_low"], pts[1]["ref_low"]) == (12.0, 11.5)


# ---------- facility ----------
def test_cross_facility_access_denied(client, make, db):
    fa, fb = make.facility("A"), make.facility("B")
    a = make.user("a@x.com", "facility_admin", facility_id=fa.id)
    make.user("b@x.com", "facility_admin", facility_id=fb.id)
    from app.models import FacilityService
    svc_b = db.scalars(select(FacilityService).where(FacilityService.facility_id == fb.id)).first()
    from app.models import FacilityService as FS
    s = FS(facility_id=fb.id, service_code="cardiology", available=True); db.add(s); db.commit()
    assert client.put(f"/api/v1/facility/services/{s.id}", headers=auth(a), json={"service_code": "cardiology", "available": False}).status_code == 404
    assert client.delete(f"/api/v1/facility/services/{s.id}", headers=auth(a)).status_code == 404
    assert client.get("/api/v1/facility/services", headers=auth(a)).json()["items"] == []


def test_price_change_requires_source_and_is_stamped(client, make, db):
    f = make.facility()
    a = make.user("a@x.com", "facility_admin", facility_id=f.id)
    assert client.post("/api/v1/facility/prices", headers=auth(a), json={"item_code": "cbc", "price_bdt": 500, "source": " "}).status_code == 400
    r = client.post("/api/v1/facility/prices", headers=auth(a), json={"item_code": "cbc", "price_bdt": 500, "source": "front desk"})
    assert r.status_code == 200 and r.json()["confirmed_at"]
    staff = make.user("s@x.com", "facility_staff", facility_id=f.id)
    assert client.post("/api/v1/facility/prices", headers=auth(staff), json={"item_code": "x", "price_bdt": 1, "source": "y"}).status_code == 403


# ---------- admin ----------
def test_verification_needs_reason_and_evidence_and_updates_directory(client, make, db):
    admin = make.user("ad@x.com", "super_admin")
    d = make.doctor("d@x.com", verification="unverified", name="Dr Pending")
    h = auth(admin)
    assert client.patch(f"/api/v1/admin/doctors/{d.id}/verify", headers=h, json={"decision": "approve", "reason": "", "evidence": ["bmdc.pdf"]}).status_code == 400
    assert client.patch(f"/api/v1/admin/doctors/{d.id}/verify", headers=h, json={"decision": "approve", "reason": "ok", "evidence": []}).status_code == 400
    ok = client.patch(f"/api/v1/admin/doctors/{d.id}/verify", headers=h, json={"decision": "approve", "reason": "BMDC checked", "evidence": ["bmdc.pdf"]})
    assert ok.json()["verification"] == "verified"
    assert client.get(f"/api/v1/directory/doctors/{d.id}").json()["verification"] == "verified"
    log = db.scalars(select(AuditLog).where(AuditLog.action == "admin.doctor.verify")).first()
    assert log.reason == "BMDC checked" and log.before["verification"] == "unverified" and log.after["verification"] == "verified"


def test_audit_export_and_reviewer_cannot_read_audit(client, make):
    admin, rev = make.user("ad@x.com", "super_admin"), make.user("rv@x.com", "reviewer")
    r = client.get("/api/v1/admin/audit-logs/export", headers=auth(admin))
    assert r.status_code == 200 and r.text.startswith("id,at,actor_id")
    assert client.get("/api/v1/admin/audit-logs", headers=auth(rev)).status_code == 403


def test_no_admin_route_edits_signed_notes(client):
    paths = client.app.openapi()["paths"]
    assert not any("/admin" in p and "note" in p for p in paths)


def test_role_application_approval_activates_doctor(client, make, db):
    u = make.user("newdoc@x.com", "patient")
    r = client.post("/api/v1/auth/role-applications", headers=auth(u), json={"requested_role": "doctor", "details": {"full_name": "Dr New"}, "evidence_refs": ["id.pdf"]}).json()
    admin = make.user("ad@x.com", "super_admin")
    assert client.patch(f"/api/v1/admin/role-applications/{r['id']}", headers=auth(admin), json={"decision": "approve", "reason": ""}).status_code == 400
    assert client.patch(f"/api/v1/admin/role-applications/{r['id']}", headers=auth(admin), json={"decision": "approve", "reason": "docs ok"}).json()["status"] == "approved"
    assert client.get("/api/v1/auth/me", headers=auth(u)).json()["role"] == "doctor"


def test_onboarding_gates_dashboard_and_budget_is_band(client, make, db):
    from app.models import PatientProfile
    p = make.user("p@x.com")
    db.get(PatientProfile, p.id).onboarding_completed = False; db.commit()
    assert client.get("/api/v1/patients/me/dashboard", headers=auth(p)).status_code == 403
    assert client.put("/api/v1/patients/me/preferences", headers=auth(p), json={"budget": "5000"}).status_code == 400
    assert client.put("/api/v1/patients/me/preferences", headers=auth(p), json={"budget": "low"}).status_code == 200
    client.put("/api/v1/patients/me", headers=auth(p), json={"onboarding_completed": True})
    assert client.get("/api/v1/patients/me/dashboard", headers=auth(p)).json()["emergency_number"] == "999"


def test_audit_log_is_append_only_in_api():
    from app.main import app
    for path, ops in app.openapi()["paths"].items():
        if "audit" in path:
            assert set(ops) <= {"get"}      # no update/delete endpoints for audit logs
