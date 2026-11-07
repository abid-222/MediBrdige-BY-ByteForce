import pytest
from tests.conftest import auth


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_error_format(client):
    r = client.get("/api/v1/auth/me")
    assert set(r.json()["error"]) == {"code", "message", "details"}


def test_ml_classifier_and_abstain(client, make):
    pytest.importorskip("sklearn")
    from ml import train
    import os
    if not os.path.exists(os.path.join(os.path.dirname(train.__file__), "model.joblib")):
        train.main()
    admin = make.user("a@x.com", "super_admin")
    r = client.post("/api/v1/ml/document-classify", headers=auth(admin), json={"text": "Rx Tab. 500 mg twice daily after meals"}).json()
    assert r["label"] == "prescription" and "research prototype" in r["label_note"]
    r2 = client.post("/api/v1/ml/document-classify", headers=auth(admin), json={"text": "zzzz qqqq xxxx"}).json()
    assert r2["label"] == "other"


def test_ml_overview_endpoint(client):
    r = client.get("/api/v1/ml/overview")
    assert r.status_code == 200
    data = r.json()
    assert data["models_count"] >= 1
    assert data["pipeline"]["status"] == "healthy"
    model = data["models"][0]
    assert model["status"] == "deployed"
    # Verify unperformed real-world metrics are explicitly "Not evaluated"
    assert model["unsupported_or_unevaluated_metrics"]["clinical_real_world_accuracy"] == "Not evaluated"


def test_ml_datasets_endpoint(client):
    r = client.get("/api/v1/ml/datasets")
    assert r.status_code == 200
    catalog = r.json()["datasets"]
    assert len(catalog) >= 2
    ids = [d["id"] for d in catalog]
    assert "doc_types" in ids

    # Test individual dataset inspection
    r_detail = client.get("/api/v1/ml/datasets/doc_types")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert detail["row_count"] == 240
    assert detail["total_missing_cells"] == 0
    assert len(detail["features"]) == 3
    assert len(detail["preview_rows"]) > 0


def test_ml_predict_and_explain_endpoint(client):
    # Test valid lab inference
    r = client.post("/api/v1/ml/predict", json={"text": "Complete Blood Count Hemoglobin 14 g/dL WBC platelet reference range"})
    assert r.status_code == 200
    res = r.json()
    assert res["label"] == "lab"
    assert res["confidence"] > 0.55
    assert res["abstained"] is False
    assert "lab" in res["probabilities"]
    assert len(res["token_attributions"]) > 0
    assert "disclaimer" in res
    assert "AI assists. Doctors decide" in res["disclaimer"]

    # Test out-of-distribution text triggers abstain gate (< 0.55 confidence -> "other")
    r_noise = client.post("/api/v1/ml/predict", json={"text": "zzzz qqqq xxxx random unmedical text"})
    assert r_noise.status_code == 200
    res_noise = r_noise.json()
    assert res_noise["label"] == "other"

    # Test input validation (too short)
    r_short = client.post("/api/v1/ml/predict", json={"text": "a"})
    assert r_short.status_code == 422


def test_ml_explainability_endpoint(client):
    r = client.get("/api/v1/ml/explainability")
    assert r.status_code == 200
    data = r.json()
    assert "document-type-classifier" in data["model_id"]
    assert "lab" in data["global_importance"]
    assert "prescription" in data["global_importance"]
    assert len(data["global_importance"]["lab"]["top_positive"]) > 0

    # Verify SHAP and LIME are accurately reported as not implemented
    methods = {m["id"]: m for m in data["methods"]}
    assert methods["shap"]["supported"] is False
    assert methods["lime"]["supported"] is False
    assert methods["linear_attribution"]["supported"] is True
    assert "AI assists. Doctors decide" in data["clinical_disclaimer"]

