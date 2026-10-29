"""Integration tests: real handlers against a real MySQL database."""
import json
import os

import pytest

from conftest import TRIP, Client, make_event

pytestmark = pytest.mark.usefixtures("database", "clean")


# ---------- authentication / authorisation ----------
def test_no_claims_is_401():
    import app

    r = app.lambda_handler({"rawPath": "/trips", "requestContext": {"http": {"method": "GET"}}}, None)
    assert r["statusCode"] == 401


def test_unknown_route_404_and_wrong_method_405(alice):
    assert alice.get("/nope")[0] == 404
    assert alice.call("PATCH", "/trips")[0] == 405


def test_user_row_created_from_token_only(alice):
    from common import db

    alice.get("/trips")
    row = db.query("SELECT email, role FROM users WHERE cognito_sub=%s", ("sub-user-a",), one=True)
    assert row == {"email": "a@example.com", "role": "user"}


def test_user_id_in_body_is_ignored(alice, bob):
    from common import db

    s, data = alice.post("/trips", {**TRIP, "user_id": 999, "userId": 999, "user": "sub-user-b"})
    assert s == 201
    owner = db.query("SELECT u.cognito_sub FROM trips t JOIN users u ON u.id=t.user_id WHERE t.id=%s",
                     (data["id"],), one=True)
    assert owner["cognito_sub"] == "sub-user-a"
    assert bob.get("/trips")[1] == []


# ---------- trips ----------
def test_trip_crud(alice):
    s, t = alice.post("/trips", TRIP)
    assert s == 201 and t["to"] == "Bali" and t["days"] == 5 and t["budget"] == 10000
    tid = t["id"]
    assert alice.get("/trips")[1][0]["id"] == tid
    s, t2 = alice.put(f"/trips/{tid}", {**TRIP, "to": "Goa", "budget": 20000})
    assert s == 200 and t2["to"] == "Goa" and t2["budget"] == 20000
    assert alice.delete(f"/trips/{tid}")[0] == 204
    assert alice.get(f"/trips/{tid}")[0] == 404


@pytest.mark.parametrize("patch", [
    {"from": ""}, {"to": None}, {"startDate": "bad"}, {"endDate": "2026-12-01"},
    {"travelers": 0}, {"budget": -5}, {"notes": "x" * 5001}, {"endDate": "2028-12-14"},
])
def test_trip_validation(alice, patch):
    s, data = alice.post("/trips", {**TRIP, **patch})
    assert s == 400 and data["error"]["code"] == "validation_error"


def test_invalid_json_body_400(alice):
    import app

    ev = make_event("POST", "/trips", sub="sub-user-a")
    ev["body"] = "{not json"
    assert app.lambda_handler(ev, None)["statusCode"] == 400


def test_sql_injection_string_is_stored_literally(alice):
    evil = "Bali'; DROP TABLE trips; --"
    s, t = alice.post("/trips", {**TRIP, "to": evil})
    assert s == 201 and t["to"] == evil
    assert alice.get("/trips")[0] == 200


def test_other_user_cannot_touch_trip(alice, bob, trip_id):
    for method, path, body in [
        ("GET", f"/trips/{trip_id}", None), ("PUT", f"/trips/{trip_id}", TRIP),
        ("DELETE", f"/trips/{trip_id}", None), ("GET", f"/trips/{trip_id}/budget", None),
        ("PUT", f"/trips/{trip_id}/budget", {"totalBudget": 1}), ("GET", f"/trips/{trip_id}/expenses", None),
        ("POST", f"/trips/{trip_id}/expenses", {"category": "meals", "description": "x", "amount": 1}),
        ("GET", f"/trips/{trip_id}/itinerary", None), ("PUT", f"/trips/{trip_id}/itinerary", {"days": {}}),
        ("GET", f"/trips/{trip_id}/summary", None), ("GET", f"/trips/{trip_id}/threshold", None),
        ("POST", f"/trips/{trip_id}/reports", {"format": "csv"}),
    ]:
        assert bob.call(method, path, body)[0] == 404, (method, path)
    assert alice.get(f"/trips/{trip_id}")[0] == 200          # untouched


def test_delete_trip_cascades(alice, trip_id):
    from common import db

    alice.post(f"/trips/{trip_id}/expenses", {"category": "meals", "description": "x", "amount": 5})
    alice.put(f"/trips/{trip_id}/itinerary", {"days": {"day1": [{"time": "09:00", "activity": "a", "cost": 1}]}})
    alice.delete(f"/trips/{trip_id}")
    for table in ("budgets", "expenses", "itineraries"):
        assert db.query(f"SELECT COUNT(*) AS n FROM {table} WHERE trip_id=%s", (trip_id,), one=True)["n"] == 0
    assert db.query("SELECT COUNT(*) AS n FROM itinerary_activities", one=True)["n"] == 0


# ---------- budget ----------
def test_budget_put_get(alice, trip_id):
    s, b = alice.get(f"/trips/{trip_id}/budget")
    assert s == 200 and b["totalBudget"] == 10000
    body = {"totalBudget": 5000, "transportation": 1000, "accommodation": 2000, "meals": 1000,
            "activities": 500, "miscellaneous": 500, "alertsEnabled": True}
    s, b = alice.put(f"/trips/{trip_id}/budget", body)
    assert s == 200 and b["accommodation"] == 2000 and b["alertsEnabled"] is True
    assert alice.put(f"/trips/{trip_id}/budget", {"totalBudget": -1})[0] == 400


# ---------- expenses and thresholds ----------
def add(c, tid, amount, cat="meals", desc="x"):
    return c.post(f"/trips/{tid}/expenses", {"category": cat, "description": desc, "amount": amount})


def test_expense_crud_and_totals(alice, trip_id):
    s, r = add(alice, trip_id, 2500.50, "transportation", "Flight")
    assert s == 201 and r["expense"]["amount"] == 2500.5 and r["threshold"]["status"] == "ok"
    eid = r["expense"]["id"]
    s, r = alice.put(f"/expenses/{eid}", {"category": "meals", "description": "Dinner", "amount": 100})
    assert s == 200 and r["expense"]["category"] == "meals"
    s, summ = alice.get(f"/trips/{trip_id}/summary")
    assert summ["totalSpent"] == 100 and summ["remaining"] == 9900 and summ["byCategory"]["meals"]["spent"] == 100
    assert alice.delete(f"/expenses/{eid}")[0] == 204
    assert alice.get(f"/trips/{trip_id}/summary")[1]["totalSpent"] == 0
    assert alice.get(f"/trips/{trip_id}/expenses")[1] == []


@pytest.mark.parametrize("body", [
    {"category": "hax", "description": "x", "amount": 1}, {"category": "meals", "description": "", "amount": 1},
    {"category": "meals", "description": "x", "amount": 0}, {"category": "meals", "description": "x", "amount": -5},
    {"category": "meals", "description": "x", "amount": "abc"}, {"category": "meals", "description": "x"},
    {"category": "meals", "description": "x", "amount": 1, "date": "nope"},
])
def test_expense_validation(alice, trip_id, body):
    assert alice.post(f"/trips/{trip_id}/expenses", body)[0] == 400


def test_other_user_cannot_edit_or_delete_expense(alice, bob, trip_id):
    eid = add(alice, trip_id, 10)[1]["expense"]["id"]
    assert bob.put(f"/expenses/{eid}", {"category": "meals", "description": "h", "amount": 1})[0] == 404
    assert bob.delete(f"/expenses/{eid}")[0] == 404
    assert alice.get(f"/trips/{trip_id}/expenses")[1][0]["amount"] == 10


def test_80_and_100_percent_thresholds(alice, trip_id):          # budget is 10000
    assert add(alice, trip_id, 7999)[1]["threshold"]["status"] == "ok"
    assert add(alice, trip_id, 1)[1]["threshold"]["status"] == "warning"      # exactly 80%
    assert alice.get(f"/trips/{trip_id}/threshold")[1]["status"] == "warning"
    assert add(alice, trip_id, 2000)[1]["threshold"]["status"] == "exceeded"  # exactly 100%
    assert alice.get(f"/trips/{trip_id}/summary")[1]["remaining"] == 0


class FakeSNS:
    def __init__(self): self.sent = []
    def publish(self, **kw): self.sent.append(kw)


def test_sns_alert_once_per_crossing_and_only_if_enabled(alice, trip_id, monkeypatch):
    from common import aws

    sns = FakeSNS()
    monkeypatch.setattr(aws, "get_sns", lambda: sns)
    monkeypatch.setenv("ALERT_TOPIC_ARN", "arn:aws:sns:ap-south-1:123:t")
    add(alice, trip_id, 8500)                                   # alerts disabled -> no mail
    assert sns.sent == []
    alice.put(f"/trips/{trip_id}/budget", {"totalBudget": 10000, "alertsEnabled": True})
    add(alice, trip_id, 100)                                    # still warning, no new crossing
    assert sns.sent == []
    add(alice, trip_id, 1500)                                   # warning -> exceeded
    assert len(sns.sent) == 1 and "exceeded" in sns.sent[0]["Subject"]
    add(alice, trip_id, 50)                                     # still exceeded
    assert len(sns.sent) == 1


def test_sns_failure_does_not_break_the_request(alice, trip_id, monkeypatch):
    from common import aws

    class Boom:
        def publish(self, **kw): raise RuntimeError("no route to SNS")

    monkeypatch.setattr(aws, "get_sns", lambda: Boom())
    monkeypatch.setenv("ALERT_TOPIC_ARN", "arn:x")
    alice.put(f"/trips/{trip_id}/budget", {"totalBudget": 100, "alertsEnabled": True})
    assert add(alice, trip_id, 100)[0] == 201


# ---------- itinerary ----------
ITIN = {"days": {"day1": [{"time": "09:00", "activity": "Temple", "cost": 500},
                          {"time": "13:00", "activity": "Lunch", "cost": "250.50"}],
                 "day2": [{"time": "10:00", "activity": "Surf", "cost": 0}]}}


def test_itinerary_save_load_replace(alice, trip_id):
    s, it = alice.put(f"/trips/{trip_id}/itinerary", ITIN)
    assert s == 200 and it["totalPlanned"] == 750.5 and [a["activity"] for a in it["days"]["day1"]] == ["Temple", "Lunch"]
    assert alice.get(f"/trips/{trip_id}/itinerary")[1]["totalDays"] == 5
    s, it = alice.put(f"/trips/{trip_id}/itinerary", {"days": {"day3": [{"time": "08:00", "activity": "Hike", "cost": 5}]}})
    assert list(it["days"]) == ["day3"] and it["totalPlanned"] == 5
    assert alice.put(f"/trips/{trip_id}/itinerary", {"days": {}})[1]["totalPlanned"] == 0


@pytest.mark.parametrize("days", [
    {"day9": [{"time": "09:00", "activity": "x", "cost": 1}]}, {"dayX": []}, {"day1": "no"},
    {"day1": [{"time": "9am", "activity": "x", "cost": 1}]}, {"day1": [{"time": "09:00", "activity": "", "cost": 1}]},
    {"day1": [{"time": "09:00", "activity": "x", "cost": -1}]},
])
def test_itinerary_validation_leaves_old_data_intact(alice, trip_id, days):
    alice.put(f"/trips/{trip_id}/itinerary", ITIN)
    assert alice.put(f"/trips/{trip_id}/itinerary", {"days": days})[0] == 400
    assert alice.get(f"/trips/{trip_id}/itinerary")[1]["totalPlanned"] == 750.5


def test_planned_vs_actual(alice, trip_id):
    alice.put(f"/trips/{trip_id}/itinerary", ITIN)
    add(alice, trip_id, 300)
    pva = alice.get(f"/trips/{trip_id}/summary")[1]["plannedVsActual"]
    assert pva == {"planned": 750.5, "actual": 300, "difference": 450.5}


# ---------- dashboard ----------
def test_dashboard_totals(alice, bob, trip_id):
    alice.post("/trips", {**TRIP, "budget": 5000})
    add(alice, trip_id, 9000, "meals")
    d = alice.get("/dashboard")[1]
    assert d["totalTrips"] == 2 and d["plannedBudget"] == 15000 and d["actualSpending"] == 9000
    assert d["remainingBudget"] == 6000 and d["tripsInWarning"] == 1 and d["byCategory"] == {"meals": 9000}
    assert bob.get("/dashboard")[1]["totalTrips"] == 0


# ---------- reports ----------
class FakeS3:
    def __init__(self): self.objects = {}
    def put_object(self, **kw): self.objects[kw["Key"]] = kw
    def generate_presigned_url(self, op, Params, ExpiresIn): return f"https://s3.example/{Params['Key']}?exp={ExpiresIn}"


def test_report_csv_and_pdf_go_to_users_prefix(alice, trip_id, monkeypatch):
    from common import aws

    s3 = FakeS3()
    monkeypatch.setattr(aws, "get_s3", lambda: s3)
    monkeypatch.setenv("REPORT_BUCKET", "bkt")
    add(alice, trip_id, 123.45, "meals", "Dinner")
    s, r = alice.post(f"/trips/{trip_id}/reports", {"format": "csv"})
    assert s == 201 and r["key"].startswith(f"reports/sub-user-a/{trip_id}/") and r["key"].endswith(".csv")
    body = s3.objects[r["key"]]["Body"].decode()
    assert "Dinner" in body and "123.45" in body
    s, r = alice.post(f"/trips/{trip_id}/reports", {"format": "pdf"})
    assert s == 201 and s3.objects[r["key"]]["Body"].startswith(b"%PDF")
    assert s3.objects[r["key"]]["ServerSideEncryption"] == "AES256"
    assert alice.post(f"/trips/{trip_id}/reports", {"format": "exe"})[0] == 400


def test_report_needs_bucket_config(alice, trip_id, monkeypatch):
    monkeypatch.delenv("REPORT_BUCKET", raising=False)
    assert alice.post(f"/trips/{trip_id}/reports", {"format": "csv"})[0] == 503


# ---------- admin ----------
def test_admin_analytics_authorisation(alice, admin, trip_id):
    assert alice.get("/admin/analytics")[0] == 403
    s, a = admin.get("/admin/analytics")
    assert s == 200 and a["totalTrips"] == 1 and a["totalUsers"] == 2
    assert a["topDestinations"][0]["destination"] == "Bali"
    assert "email" not in json.dumps(a)                      # no personal data in analytics


def test_admin_role_not_grantable_via_body(alice):
    alice.post("/trips", {**TRIP, "role": "admin", "groups": ["admins"]})
    assert alice.get("/admin/analytics")[0] == 403


def test_me_endpoint(admin, alice):
    assert admin.get("/me")[1]["isAdmin"] is True
    assert alice.get("/me")[1]["isAdmin"] is False


# ---------- migrations ----------
def test_migration_is_idempotent_and_files_in_sync():
    import filecmp, os
    from handlers import migrate

    assert migrate.lambda_handler({}, None)["applied"] == []
    root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    for f in os.listdir(os.path.join(root, "database", "migrations")):
        assert filecmp.cmp(os.path.join(root, "database", "migrations", f),
                           os.path.join(root, "backend", "src", "migrations", f), shallow=False), f


# ---------- migrator: creates DB + least-privilege user ----------
def test_migrator_creates_database_and_app_user(monkeypatch):
    import pymysql
    from common import db
    from handlers import migrate
    from conftest import HOST, PORT, USER, PASSWORD

    root = pymysql.connect(host=HOST, port=PORT, user=USER, password=PASSWORD, autocommit=True)
    with root.cursor() as c:
        c.execute("DROP DATABASE IF EXISTS voyara_mig")
        c.execute("DROP USER IF EXISTS 'voyara_app_t'@'%'")
    old = {k: os.environ.get(k) for k in ("DB_NAME",)}
    monkeypatch.setenv("DB_NAME", "voyara_mig")
    monkeypatch.setenv("APP_DB_USER", "voyara_app_t")
    monkeypatch.setenv("APP_DB_PASSWORD", "Str0ng-pass!")
    try:
        db.reset()
        out = migrate.lambda_handler({}, None)
        assert out["applied"] == ["V001"] and out["appUser"] == "voyara_app_t"
        # the app user can read/write data but cannot drop tables
        app = pymysql.connect(host=HOST, port=PORT, user="voyara_app_t", password="Str0ng-pass!", database="voyara_mig", autocommit=True)
        with app.cursor() as c:
            c.execute("SELECT COUNT(*) FROM users")
            with pytest.raises(pymysql.err.OperationalError):
                c.execute("DROP TABLE users")
        app.close()
    finally:
        db.reset()
        with root.cursor() as c:
            c.execute("DROP DATABASE IF EXISTS voyara_mig")
            c.execute("DROP USER IF EXISTS 'voyara_app_t'@'%'")
        root.close()
        monkeypatch.undo()
        db.reset()
