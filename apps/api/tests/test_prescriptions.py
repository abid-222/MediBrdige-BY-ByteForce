import pytest
from datetime import datetime, timezone
from app.models import (
    Appointment,
    CareRelationship,
    Consent,
    DoctorProfile,
    PatientProfile,
    Prescription,
    Profile,
)
from tests.conftest import auth


@pytest.fixture
def prescription_setup(db, make):
    patient = make.user("patient_rx@example.com", "patient", name="Rahim Uddin")
    verified_doc = make.doctor("doctor_rx_verified@example.com", verification="verified", name="Dr. Verified")
    unverified_doc = make.doctor("doctor_rx_unverified@example.com", verification="unverified", name="Dr. Unverified")

    # Authorize verified doc
    make.link(patient, verified_doc, share=True, resources=["profile", "documents", "observations", "notes"])
    # Authorize unverified doc
    make.link(patient, unverified_doc, share=True, resources=["profile", "documents", "observations", "notes"])

    return {"patient": patient, "verified_doctor": verified_doc, "unverified_doctor": unverified_doc}


def test_doctor_draft_prescription(client, prescription_setup):
    doc = prescription_setup["verified_doctor"]
    patient = prescription_setup["patient"]
    headers = auth(doc)

    res = client.post("/api/v1/prescriptions/draft", json={
        "patient_id": patient.id,
        "diagnosis": "Essential Hypertension Stage 1",
        "clinical_notes": "Reduce dietary sodium and 30 min daily brisk walking.",
        "medications": [
            {
                "name": "Amlodipine",
                "dosage": "5 mg",
                "frequency": "1+0+0 (Morning)",
                "duration": "30 days",
                "instructions": "Take after breakfast",
            },
            {
                "name": "Paracetamol",
                "dosage": "500 mg",
                "frequency": "As needed (SOS)",
                "duration": "3 days",
                "instructions": "Take after meals if headache occurs",
            }
        ],
        "follow_up_recommendation": "Review blood pressure in 4 weeks.",
    }, headers=headers)

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "draft"
    assert data["diagnosis"] == "Essential Hypertension Stage 1"
    assert len(data["medications"]) == 2
    assert data["medications"][0]["name"] == "Amlodipine"
    assert data["doctor_name"] is not None


def test_unverified_doctor_cannot_issue_prescription(client, prescription_setup):
    unverified_doc = prescription_setup["unverified_doctor"]
    patient = prescription_setup["patient"]
    headers = auth(unverified_doc)

    # Draft succeeds
    draft_res = client.post("/api/v1/prescriptions/draft", json={
        "patient_id": patient.id,
        "diagnosis": "Mild Fever",
        "medications": [{"name": "Paracetamol", "dosage": "500 mg", "frequency": "1+1+1", "duration": "3 days"}],
    }, headers=headers)
    assert draft_res.status_code == 200
    rx_id = draft_res.json()["id"]

    # Issue must fail for unverified doctor
    issue_res = client.post(f"/api/v1/prescriptions/{rx_id}/issue", headers=headers)
    assert issue_res.status_code == 403
    assert issue_res.json()["error"]["code"] == "doctor_not_verified"


def test_verified_doctor_issue_locks_prescription(client, prescription_setup):
    doc = prescription_setup["verified_doctor"]
    patient = prescription_setup["patient"]
    doc_headers = auth(doc)
    patient_headers = auth(patient)

    # 1. Draft
    draft_res = client.post("/api/v1/prescriptions/draft", json={
        "patient_id": patient.id,
        "diagnosis": "Acute Bronchitis",
        "medications": [
            {"name": "Azithromycin", "dosage": "500 mg", "frequency": "1+0+0", "duration": "5 days", "instructions": "1 hour before food"}
        ],
        "clinical_notes": "Drink warm fluids and steam inhalation.",
        "follow_up_recommendation": "Return if fever persists after 3 days.",
    }, headers=doc_headers)
    assert draft_res.status_code == 200
    rx_id = draft_res.json()["id"]

    # 2. Patient cannot view draft
    patient_view_draft = client.get(f"/api/v1/prescriptions/{rx_id}", headers=patient_headers)
    assert patient_view_draft.status_code == 404

    # 3. Verified doctor issues prescription
    issue_res = client.post(f"/api/v1/prescriptions/{rx_id}/issue", headers=doc_headers)
    assert issue_res.status_code == 200
    data = issue_res.json()
    assert data["status"] == "issued"
    assert data["issued_at"] is not None

    # 4. Silent edit on issued prescription is rejected with 409
    edit_res = client.put(f"/api/v1/prescriptions/{rx_id}", json={
        "diagnosis": "Changed Diagnosis Silently",
    }, headers=doc_headers)
    assert edit_res.status_code == 409
    assert edit_res.json()["error"]["code"] == "prescription_locked"

    # 5. Patient can now view issued prescription
    patient_rx = client.get(f"/api/v1/prescriptions/{rx_id}", headers=patient_headers)
    assert patient_rx.status_code == 200
    assert patient_rx.json()["status"] == "issued"
    assert len(patient_rx.json()["medications"]) == 1

    # 6. Patient can list their own prescriptions
    my_rxs = client.get("/api/v1/prescriptions/me", headers=patient_headers)
    assert my_rxs.status_code == 200
    assert any(item["id"] == rx_id for item in my_rxs.json()["items"])

    # 7. PDF generation returns valid PDF
    pdf_res = client.get(f"/api/v1/prescriptions/{rx_id}/pdf", headers=patient_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")


def test_amend_and_cancel_prescription(client, prescription_setup):
    doc = prescription_setup["verified_doctor"]
    patient = prescription_setup["patient"]
    headers = auth(doc)

    # 1. Create and issue
    draft_res = client.post("/api/v1/prescriptions/draft", json={
        "patient_id": patient.id,
        "diagnosis": "Type 2 Diabetes Mellitus",
        "medications": [{"name": "Metformin", "dosage": "500 mg", "frequency": "1+0+1", "duration": "30 days"}],
    }, headers=headers)
    rx_id = draft_res.json()["id"]
    client.post(f"/api/v1/prescriptions/{rx_id}/issue", headers=headers)

    # 2. Amend prescription
    amend_res = client.post(f"/api/v1/prescriptions/{rx_id}/amend", json={
        "amendment_note": "Increased Metformin dosage to 850mg due to elevated HbA1c.",
        "medications": [{"name": "Metformin", "dosage": "850 mg", "frequency": "1+0+1", "duration": "30 days"}],
    }, headers=headers)
    assert amend_res.status_code == 200
    new_rx = amend_res.json()
    assert new_rx["version"] == 2
    assert new_rx["original_prescription_id"] == rx_id
    assert new_rx["status"] == "issued"
    assert new_rx["medications"][0]["dosage"] == "850 mg"

    # 3. Cancel the amended prescription
    cancel_res = client.post(f"/api/v1/prescriptions/{new_rx['id']}/cancel", json={
        "reason": "Patient reported gastrointestinal intolerance; switching to Linagliptin.",
    }, headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "cancelled"
    assert cancel_res.json()["cancellation_reason"] is not None
