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
