"""G3 emergency vs budget, G5 stale directory, G6 scope creep."""
from datetime import datetime, timedelta, timezone
from app.core.config import STALE_AFTER_DAYS
from app.modules.directory.service import is_stale
from app.modules.navigator import service as nav
from tests.conftest import auth

EMERGENCY_TEXTS = ["severe chest pain and shortness of breath", "বুকে তীব্র ব্যথা, শ্বাসকষ্ট", "my father is unconscious", "he is having a seizure",
                   "I want to end my life", "sudden weakness one side and slurred speech", "bleeding heavily and won't stop"]


def test_red_flag_engine_en_and_bn():
    for t in EMERGENCY_TEXTS:
        assert nav.triage(t)["emergency"], t
    assert not nav.triage("mild cough for two days")["emergency"]


def test_emergency_overrides_budget_and_returns_no_matches(client, make):
    p = make.user("p@x.com")
    make.doctor("cheap@x.com", specialty="cardiology", fee=100)
    for text in EMERGENCY_TEXTS[:2]:
        r = client.post("/api/v1/navigator/matches", headers=auth(p), json={"text": text, "budget": "low", "budget_first": True}).json()
        assert r["emergency"] is True and r["eligible"] == [] and r["needs_review"] == [] and "999" in r["guidance"] + r["emergency_number"]


def test_crisis_message_for_self_harm():
    t = nav.triage("I want to end my life", "en")
    assert t["emergency"] and "not alone" in t["guidance"]


def test_cheap_gate_failed_provider_never_recommended(client, make):
    p = make.user("p@x.com")
    make.doctor("good@x.com", specialty="cardiology", fee=1500, name="Dr Good")
    make.doctor("wrong@x.com", specialty="dermatology", fee=100, name="Dr Cheap Wrong")      # wrong specialty, very cheap
    f_no = make.facility("No Cardio Svc")
    cheap_rej = make.doctor("rej@x.com", specialty="cardiology", fee=50, verification="rejected", facility=f_no, name="Dr Rejected")
    r = client.post("/api/v1/navigator/matches", headers=auth(p), json={"text": "heart palpitation", "budget": "low", "budget_first": True}).json()
    names = [c["doctor_name"] for c in r["eligible"] + r["needs_review"]]
    assert "Dr Good" in names and "Dr Cheap Wrong" not in names and "Dr Rejected" not in names
    assert r["excluded_count"] >= 1
    assert all(c["reasons"] for c in r["eligible"])      # reason + confidence on every card


def test_budget_toggle_only_reorders_eligible(client, make):
    p = make.user("p@x.com")
    make.doctor("exp@x.com", specialty="cardiology", fee=3000, name="Dr Expensive")
    make.doctor("cheap@x.com", specialty="cardiology", fee=500, name="Dr Affordable", verified_days_ago=5)
    make.doctor("unv@x.com", specialty="cardiology", fee=100, verification="unverified", name="Dr Unverified")
    r = client.post("/api/v1/navigator/matches", headers=auth(p), json={"text": "heart", "budget": "low", "budget_first": True}).json()
    assert r["eligible"][0]["doctor_name"] == "Dr Affordable"
    assert "Dr Unverified" not in [c["doctor_name"] for c in r["eligible"]]      # unverified can't jump ahead via price


def test_unknown_fee_not_confirmed(client, make):
    p = make.user("p@x.com")
    make.doctor("nofee@x.com", specialty="cardiology", fee=None)
    r = client.post("/api/v1/navigator/matches", headers=auth(p), json={"text": "heart"}).json()
    card = (r["eligible"] + r["needs_review"])[0]
    assert card["fee_label"] == "Not confirmed" and card["cost_state"] == "not_confirmed" and card["affordability"] == "unknown"


def test_llm_free_specialty_must_be_allowed(client, make):
    p = make.user("p@x.com")
    r = client.post("/api/v1/navigator/matches", headers=auth(p), json={"text": "x", "specialties": ["witchcraft"]})
    assert r.status_code == 400


def test_unsupported_area_message_G6(client, make):
    p = make.user("p@x.com")
    r = client.post("/api/v1/navigator/matches", headers=auth(p), json={"text": "heart", "district": "Chattogram"}).json()
    assert r["unsupported"] and "not supported yet" in r["message"]


# ---------- G5 ----------
def test_stale_constant_shared():
    assert STALE_AFTER_DAYS == 90
    now = datetime.now(timezone.utc)
    assert is_stale(now - timedelta(days=91)) and not is_stale(now - timedelta(days=89)) and is_stale(None)


def test_directory_states(client, make):
    make.doctor("v@x.com", specialty="cardiology", verification="verified", fee=900, verified_days_ago=10, name="Dr Fresh")
    make.doctor("s@x.com", specialty="cardiology", verification="verified", fee=900, verified_days_ago=200, name="Dr Stale")
    make.doctor("u@x.com", specialty="cardiology", verification="unverified", fee=None, verified_days_ago=None, name="Dr Unverified")
    items = {d["full_name"]: d for d in client.get("/api/v1/directory/doctors").json()["items"]}
    assert items["Dr Fresh"]["verification"] == "verified" and not items["Dr Fresh"]["stale"]
    assert items["Dr Stale"]["stale"]
    u = items["Dr Unverified"]
    assert u["verification"] != "verified" and u["stale"]
    assert u["chambers"][0]["fee_label"] == "Not confirmed" and u["chambers"][0]["fee_bdt"] is None
    only = client.get("/api/v1/directory/doctors?verified_only=true").json()["items"]
    assert all(d["verification"] == "verified" for d in only)
    fee = client.get("/api/v1/directory/doctors?fee_min=0&fee_max=2000").json()["items"]
    assert "Dr Unverified" not in [d["full_name"] for d in fee]       # unknown fee never matches a numeric range


def test_pending_never_shows_as_verified_and_bmdc_hidden(client, make, db):
    d = make.doctor("p@x.com", verification="pending", name="Dr Pending")
    from app.models import DoctorProfile
    db.get(DoctorProfile, d.id).bmdc_number = "A-12345"; db.commit()
    detail = client.get(f"/api/v1/directory/doctors/{d.id}").json()
    assert detail["verification"] == "pending" and detail["bmdc_number"] is None


def test_report_incorrect_info(client, make):
    d = make.doctor("r@x.com")
    assert client.post("/api/v1/directory/reports", json={"entity_type": "doctor", "entity_id": d.id, "message": "Fee is wrong"}).status_code == 200


def test_navigator_guidance_standard_and_emergency(client):
    # 1. Standard symptom inquiry
    res = client.post("/api/v1/navigator/guidance", json={"text": "fever and dry cough for 3 days", "lang": "en"}).json()
    assert res["emergency"] is False
    assert res["primary_specialty"] == "general_medicine"
    assert "General Medicine" in res["reply"]
    assert len(res["preparation_tips"]) > 0
    assert "disclaimer" in res

    # 2. Emergency symptom inquiry (red-flag)
    em_res = client.post("/api/v1/navigator/guidance", json={"text": "severe chest pain and shortness of breath", "lang": "en"}).json()
    assert em_res["emergency"] is True
    assert em_res["emergency_number"] == "999"
    assert "999" in em_res["reply"]

    # 3. Validation test (< 2 chars)
    bad_res = client.post("/api/v1/navigator/guidance", json={"text": "a", "lang": "en"})
    assert bad_res.status_code == 400

    # 4. Bangla language support
    bn_res = client.post("/api/v1/navigator/guidance", json={"text": "মাথাব্যথা এবং জ্বর", "lang": "bn"}).json()
    assert bn_res["emergency"] is False
    assert "পরামর্শ" in bn_res["reply"]
