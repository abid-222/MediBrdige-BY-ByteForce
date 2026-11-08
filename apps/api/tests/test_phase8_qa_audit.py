"""
PHASE 8 — COMPREHENSIVE INTEGRATION, QA, AND SECURITY AUDIT TEST SUITE
Executes end-to-end integration tests for Patient, Doctor, Admin, ML Lab, and Security.
"""
import io
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.core.security import make_token
from app.models import (
    Appointment,
    CareRelationship,
    ClinicalNote,
    Consent,
    DoctorProfile,
    Document,
    Extraction,
    Observation,
    PatientProfile,
    Prescription,
    Profile,
    TestCatalog,
)
from tests.conftest import auth


@pytest.fixture
def qa_environment(db, make):
    # 1. Patient Alice
    alice = make.user("alice_qa@example.com", "patient", name="Alice Ahmed")
    alice_profile = db.get(PatientProfile, alice.id)
    alice_profile.dob = "1994-08-15"
    alice_profile.sex = "female"
    alice_profile.phone = "+8801700000001"

    # 2. Patient Bob (for security boundary isolation tests)
    bob = make.user("bob_qa@example.com", "patient", name="Bob Karim")
    bob_profile = db.get(PatientProfile, bob.id)
    bob_profile.dob = "1985-02-20"
    bob_profile.sex = "male"
    bob_profile.phone = "+8801700000002"

    # 3. Verified Doctor Rahman
    doc_rahman = make.doctor("dr_rahman@example.com", specialty="general_medicine", verification="verified", name="Dr. A. Rahman")
    doc_rahman_p = db.get(DoctorProfile, doc_rahman.id)
    doc_rahman_p.bmdc_number = "BMDC-A-54321"

    # 4. Unverified Doctor
    doc_unverified = make.doctor("dr_unverified@example.com", specialty="general_medicine", verification="unverified", name="Dr. Candidate")

    # 5. Super Admin
    admin_user = make.user("admin_qa@example.com", "super_admin")

    # 6. Authorize Alice <-> Dr. Rahman
    make.link(alice, doc_rahman, share=True, resources=["profile", "documents", "observations", "notes"])

    # Also link Alice <-> Unverified Doctor to test unverified restrictions
    make.link(alice, doc_unverified, share=True, resources=["profile", "documents", "observations", "notes"])

    # 7. Add sample document and observation for Alice
    doc_alice = Document(patient_id=alice.id, uploaded_by=alice.id, file_ref="uploads/sample_cbc.pdf", mime="application/pdf", status="processed")
    db.add(doc_alice)
    db.flush()

    obs_hgb = Observation(
        patient_id=alice.id,
        document_id=doc_alice.id,
        test_code="HGB",
        value_num=11.2,
        value_raw="11.2",
        unit="g/dL",
        ref_low=12.0,
        ref_high=16.0,
        observed_on="2026-11-01",
        status="unverified",
        confidence=0.98,
    )
    db.add(obs_hgb)
    db.commit()

    return {
        "alice": alice,
        "bob": bob,
        "doc_rahman": doc_rahman,
        "doc_unverified": doc_unverified,
        "admin": admin_user,
        "alice_doc": doc_alice,
        "alice_obs": obs_hgb,
    }


# =====================================================================
# 1. PATIENT WORKFLOW TESTS
# =====================================================================

def test_patient_dashboard_and_navigator(client, qa_environment):
    alice = qa_environment["alice"]
    headers = auth(alice)

    # 1. Patient Dashboard
    dash_res = client.get("/api/v1/patients/me/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["emergency_number"] == "999"
    assert "snapshot" in dash_data

    # 2. Smart Care Navigator - General health guidance
    guidance_res = client.post("/api/v1/navigator/guidance", json={"text": "I have mild sore throat and runny nose for 2 days"}, headers=headers)
    assert guidance_res.status_code == 200
    res_data = guidance_res.json()
    assert res_data["emergency"] is False
    assert "primary_specialty" in res_data
    assert "reply" in res_data

    # 3. Smart Care Navigator - Emergency Escalation
    emergency_res = client.post("/api/v1/navigator/guidance", json={"text": "severe chest pain and shortness of breath"}, headers=headers)
    assert emergency_res.status_code == 200
    assert emergency_res.json()["emergency"] is True
    assert emergency_res.json()["emergency_number"] == "999"


def test_doctor_directory_and_appointment_booking(client, qa_environment, db):
    alice = qa_environment["alice"]
    doc = qa_environment["doc_rahman"]
    headers = auth(alice)

    # 1. Directory Search
    dir_res = client.get("/api/v1/directory/doctors?q=Rahman", headers=headers)
    assert dir_res.status_code == 200
    items = dir_res.json()["items"]
    assert len(items) >= 1
    assert items[0]["full_name"] == "Dr. A. Rahman"

    # 2. Book appointment
    slot_time = (datetime.now(timezone.utc) + timedelta(days=2)).replace(minute=0, second=0, microsecond=0)
    slot_time_iso = slot_time.isoformat()
    book_res = client.post("/api/v1/appointments", json={
        "doctor_id": doc.id,
        "slot_start": slot_time_iso,
        "reason": "Routine hypertension follow up",
        "share_opt_in": True,
    }, headers=headers)
    assert book_res.status_code == 200, book_res.text
    appt = book_res.json()
    assert appt["status"] == "requested"

    # 3. Duplicate booking prevention on same slot
    clash_res = client.post("/api/v1/appointments", json={
        "doctor_id": doc.id,
        "slot_start": slot_time_iso,
        "reason": "Attempting double booking",
    }, headers=headers)
    assert clash_res.status_code == 409


# =====================================================================
# 2. DOCTOR WORKFLOW TESTS
# =====================================================================

def test_doctor_chart_review_and_prescription_lifecycle(client, qa_environment):
    doc = qa_environment["doc_rahman"]
    alice = qa_environment["alice"]
    obs = qa_environment["alice_obs"]
    doc_headers = auth(doc)
    alice_headers = auth(alice)

    # 1. Doctor open patient chart (audited)
    chart_res = client.get(f"/api/v1/doctor/patients/{alice.id}", headers=doc_headers)
    assert chart_res.status_code == 200
    chart_data = chart_res.json()
    assert chart_data["name"] == "Alice Ahmed"
    assert "documents" in chart_data

    # 2. Doctor verifies laboratory observation
    verify_res = client.post(f"/api/v1/observations/{obs.id}/verify", headers=doc_headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "doctor_verified"
    assert verify_res.json()["doctor_verified"] is True

    # 3. Doctor drafts structured prescription
    draft_res = client.post("/api/v1/prescriptions/draft", json={
        "patient_id": alice.id,
        "diagnosis": "Microcytic Anemia Mild",
        "medications": [
            {
                "name": "Ferrous Fumarate",
                "dosage": "200 mg",
                "frequency": "1+0+1",
                "duration": "30 days",
                "instructions": "Take with orange juice or Vitamin C after food",
            }
        ],
        "clinical_notes": "Increase dietary intake of dark leafy greens and lentils.",
        "follow_up_recommendation": "Repeat CBC in 6 weeks.",
    }, headers=doc_headers)
    assert draft_res.status_code == 200
    rx_id = draft_res.json()["id"]

    # 4. Verified doctor issues prescription
    issue_res = client.post(f"/api/v1/prescriptions/{rx_id}/issue", headers=doc_headers)
    assert issue_res.status_code == 200
    assert issue_res.json()["status"] == "issued"
    assert issue_res.json()["issued_at"] is not None

    # 5. Issued prescription is immutable (edit fails with 409)
    tamper_res = client.put(f"/api/v1/prescriptions/{rx_id}", json={"diagnosis": "Hacked"}, headers=doc_headers)
    assert tamper_res.status_code == 409
    assert tamper_res.json()["error"]["code"] == "prescription_locked"

    # 6. Patient views and downloads PDF
    patient_rx_res = client.get(f"/api/v1/prescriptions/{rx_id}", headers=alice_headers)
    assert patient_rx_res.status_code == 200
    assert patient_rx_res.json()["diagnosis"] == "Microcytic Anemia Mild"

    pdf_res = client.get(f"/api/v1/prescriptions/{rx_id}/pdf", headers=alice_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")


# =====================================================================
# 3. ADMIN WORKFLOW TESTS
# =====================================================================

def test_admin_governance_and_analytics(client, qa_environment):
    admin = qa_environment["admin"]
    headers = auth(admin)

    # 1. Admin Overview Stats
    stats_res = client.get("/api/v1/admin/overview", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "users" in stats

    # 2. User Management
    users_res = client.get("/api/v1/admin/users", headers=headers)
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users["items"]) >= 4

    # 3. Doctor Verification Cases
    cases_res = client.get("/api/v1/admin/verification-queue", headers=headers)
    assert cases_res.status_code == 200

    # 4. Audit Log Access
    audit_res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert audit_res.status_code == 200


# =====================================================================
# 4. ML LAB TESTS
# =====================================================================

def test_ml_lab_pipeline_prediction_and_explainability(client, qa_environment):
    admin = qa_environment["admin"]
    headers = auth(admin)

    # 1. Overview
    overview_res = client.get("/api/v1/ml/overview")
    assert overview_res.status_code == 200
    assert overview_res.json()["models_count"] >= 1

    # 2. OCR Pipeline
    ocr_res = client.get("/api/v1/ml/ocr-pipeline")
    assert ocr_res.status_code == 200
    assert len(ocr_res.json()["stages"]) == 6

    # 3. AI Analysis Pipeline
    ai_res = client.get("/api/v1/ml/ai-pipeline")
    assert ai_res.status_code == 200
    assert len(ai_res.json()["stages"]) == 5

    # 4. Evaluation Metrics
    eval_res = client.get("/api/v1/ml/evaluation")
    assert eval_res.status_code == 200
    test_metrics = eval_res.json()["test_metrics"]
    assert test_metrics["f1_macro"] == 1.0
    assert "confusion_matrix" in test_metrics

    # 5. Real Prediction Inference
    pred_res = client.post("/api/v1/ml/predict", json={
        "text": "Complete Blood Count Hemoglobin 13.5 g/dL Platelet 250000 reference range"
    })
    assert pred_res.status_code == 200
    pred = pred_res.json()
    assert pred["label"] == "lab"
    assert pred["confidence"] >= 0.55
    assert pred["abstained"] is False
    assert "probabilities" in pred
    assert len(pred["token_attributions"]) > 0

    # 6. Real Explainability Coefficients
    exp_res = client.get("/api/v1/ml/explainability")
    assert exp_res.status_code == 200
    exp = exp_res.json()
    assert "TF-IDF" in exp["architecture"]
    assert "lab" in exp["classes"]
    assert "lab" in exp["global_importance"]
    assert len(exp["global_importance"]["lab"]["top_positive"]) > 0
    assert len(exp["methods"]) >= 4


# =====================================================================
# 5. SECURITY & ACCESS CONTROL BOUNDARY TESTS
# =====================================================================

def test_security_isolation_boundaries(client, qa_environment):
    alice = qa_environment["alice"]
    bob = qa_environment["bob"]
    doc_unverified = qa_environment["doc_unverified"]
    alice_headers = auth(alice)
    bob_headers = auth(bob)
    doc_unverified_headers = auth(doc_unverified)

    # 1. Cross-patient data isolation: Bob cannot access Alice's documents
    alice_doc_id = qa_environment["alice_doc"].id
    bob_view_doc = client.get(f"/api/v1/documents/{alice_doc_id}", headers=bob_headers)
    assert bob_view_doc.status_code == 403

    # 2. Cross-patient PDF download isolation: Bob cannot download Alice's report summary PDF
    bob_pdf = client.get(f"/api/v1/documents/{alice_doc_id}/summary-pdf", headers=bob_headers)
    assert bob_pdf.status_code == 403

    # 3. Unverified doctor can draft, but CANNOT issue prescriptions
    draft = client.post("/api/v1/prescriptions/draft", json={
        "patient_id": alice.id,
        "diagnosis": "Test",
        "medications": [{"name": "Med", "dosage": "1g"}],
    }, headers=doc_unverified_headers)
    assert draft.status_code == 200
    rx_id = draft.json()["id"]

    issue_attempt = client.post(f"/api/v1/prescriptions/{rx_id}/issue", headers=doc_unverified_headers)
    assert issue_attempt.status_code == 403
    assert issue_attempt.json()["error"]["code"] == "doctor_not_verified"

    # 4. Patient cannot access another patient's prescription
    bob_view_rx = client.get(f"/api/v1/prescriptions/{rx_id}", headers=bob_headers)
    assert bob_view_rx.status_code in (403, 404)

    # 5. Invalid / forged token rejection
    bad_headers = {"Authorization": "Bearer forged.invalid.token"}
    bad_req = client.get("/api/v1/patients/me", headers=bad_headers)
    assert bad_req.status_code == 401
