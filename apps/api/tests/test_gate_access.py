"""G4 — privacy / unauthorized access."""
from app.models import AuditLog, Document
from sqlalchemy import select
from tests.conftest import auth


def _doc(db, patient):
    d = Document(patient_id=patient.id, file_ref="x", mime="application/pdf", status="processed", doc_type="cbc")
    db.add(d); db.commit()
    return d


def test_patient_cannot_read_other_patients_document(client, make, db):
    a, b = make.user("a@x.com"), make.user("b@x.com")
    d = _doc(db, b)
    assert client.get(f"/api/v1/documents/{d.id}", headers=auth(a)).status_code == 403
    assert client.get(f"/api/v1/documents/{d.id}", headers=auth(b)).status_code == 200


def test_unrelated_doctor_denied_and_denial_logged(client, make, db):
    p, d = make.user("p@x.com"), make.doctor("d@x.com")
    doc = _doc(db, p)
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(d)).status_code == 403
    deny = db.scalars(select(AuditLog).where(AuditLog.result == "deny", AuditLog.actor_id == d.id)).all()
    assert deny and deny[0].reason == "no_care_relationship"


def test_related_doctor_with_consent_allowed_then_revoke_blocks(client, make, db):
    p, d = make.user("p@x.com"), make.doctor("d@x.com")
    make.link(p, d)
    doc = _doc(db, p)
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(d)).status_code == 200
    cid = client.get("/api/v1/consents", headers=auth(p)).json()["items"][0]["id"]
    assert client.post(f"/api/v1/consents/{cid}/revoke", headers=auth(p)).status_code == 200
    r = client.get(f"/api/v1/documents/{doc.id}", headers=auth(d))
    assert r.status_code == 403
    assert db.scalars(select(AuditLog).where(AuditLog.action == "consent.revoke")).first()
    assert db.scalars(select(AuditLog).where(AuditLog.result == "deny", AuditLog.reason == "no_active_consent")).first()


def test_expired_consent_denied(client, make, db):
    p, d = make.user("p@x.com"), make.doctor("d@x.com")
    make.link(p, d, days=-1)
    doc = _doc(db, p)
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(d)).status_code == 403


def test_consent_without_care_relationship_is_not_enough(client, make, db):
    from app.models import Consent
    p, d = make.user("p@x.com"), make.doctor("d@x.com")
    db.add(Consent(patient_id=p.id, consent_type="doctor_share", grantee_id=d.id, scope={})); db.commit()
    doc = _doc(db, p)
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(d)).status_code == 403


def test_consent_for_one_doctor_does_not_cover_another(client, make, db):
    p, d1, d2 = make.user("p@x.com"), make.doctor("d1@x.com"), make.doctor("d2@x.com")
    make.link(p, d1)
    from app.models import CareRelationship
    db.add(CareRelationship(patient_id=p.id, doctor_id=d2.id)); db.commit()
    doc = _doc(db, p)
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(d2)).status_code == 403


def test_admin_blocked_without_break_glass_then_allowed(client, make, db):
    p, admin = make.user("p@x.com"), make.user("admin@x.com", "super_admin")
    doc = _doc(db, p)
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(admin)).status_code == 403
    assert client.post("/api/v1/admin/break-glass", headers=auth(admin), json={"patient_id": p.id, "reason": "short"}).status_code == 400
    ok = client.post("/api/v1/admin/break-glass", headers=auth(admin), json={"patient_id": p.id, "reason": "Emergency record retrieval requested by ward"})
    assert ok.status_code == 200 and ok.json()["alerted"]
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(admin)).status_code == 200


def test_facility_staff_cannot_read_clinical_data(client, make, db):
    f = make.facility()
    staff = make.user("s@x.com", "facility_staff", facility_id=f.id)
    p = make.user("p@x.com")
    doc = _doc(db, p)
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(staff)).status_code == 403


def test_patient_access_log_shows_doctor_views(client, make, db):
    p, d = make.user("p@x.com"), make.doctor("d@x.com")
    make.link(p, d)
    doc = _doc(db, p)
    client.get(f"/api/v1/documents/{doc.id}", headers=auth(d))
    log = client.get("/api/v1/patients/me/access-log", headers=auth(p)).json()["items"]
    assert any(i["actor_role"] == "doctor" and i["result"] == "allow" for i in log)


def test_scope_limits_resources(client, make, db):
    p, d = make.user("p@x.com"), make.doctor("d@x.com")
    make.link(p, d, resources=["observations"])
    doc = _doc(db, p)
    assert client.get(f"/api/v1/documents/{doc.id}", headers=auth(d)).status_code == 403
    assert client.get(f"/api/v1/patients/{p.id}/observations", headers=auth(d)).status_code == 200
