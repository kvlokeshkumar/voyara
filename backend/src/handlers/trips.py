from decimal import Decimal

from common import db, validation as v
from common.errors import bad_request
from .common_queries import get_budget, owned_trip, trip_to_json


def _parse_trip(body):
    start = v.to_date(body.get("startDate"), "startDate")
    end = v.to_date(body.get("endDate"), "endDate")
    if end < start:
        raise bad_request("endDate cannot be before startDate", "endDate")
    if (end - start).days > 365:
        raise bad_request("A trip can be at most 366 days", "endDate")
    return {
        "origin": v.text(body.get("from"), "from", 120),
        "destination": v.text(body.get("to"), "to", 120),
        "start": start,
        "end": end,
        "travelers": v.integer(body.get("travelers"), "travelers", 1, 100, default=1),
        "notes": v.text(body.get("notes"), "notes", 5000, required=False),
    }


def list_trips(req):
    rows = db.query(
        "SELECT t.*, COALESCE(b.total_budget, 0) AS total_budget, "
        "COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.trip_id = t.id), 0) AS spent "
        "FROM trips t LEFT JOIN budgets b ON b.trip_id = t.id "
        "WHERE t.user_id = %s ORDER BY t.start_date DESC, t.id DESC",
        (req.user["id"],),
    )
    return 200, [trip_to_json(r, r["total_budget"], r["spent"]) for r in rows]


def create_trip(req):
    uid = req.user["id"]
    t = _parse_trip(req.body)
    budget = v.money(req.body.get("budget"), "budget", default=Decimal("0.00"))
    with db.transaction() as cur:
        cur.execute(
            "INSERT INTO trips (user_id, origin, destination, start_date, end_date, travelers, notes) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (uid, t["origin"], t["destination"], t["start"], t["end"], t["travelers"], t["notes"]),
        )
        trip_id = cur.lastrowid
        cur.execute("INSERT INTO budgets (trip_id, total_budget) VALUES (%s, %s)", (trip_id, budget))
    trip = owned_trip(uid, trip_id)
    return 201, trip_to_json(trip, budget, Decimal("0.00"))


def get_trip(req):
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    b = get_budget(trip["id"])
    spent = db.query(
        "SELECT COALESCE(SUM(amount), 0) AS s FROM expenses WHERE trip_id = %s", (trip["id"],), one=True
    )["s"]
    return 200, trip_to_json(trip, b["total_budget"], spent)


def update_trip(req):
    uid = req.user["id"]
    trip = owned_trip(uid, v.path_id(req.params["tripId"], "tripId"))
    t = _parse_trip(req.body)
    db.execute(
        "UPDATE trips SET origin=%s, destination=%s, start_date=%s, end_date=%s, travelers=%s, notes=%s "
        "WHERE id=%s AND user_id=%s",
        (t["origin"], t["destination"], t["start"], t["end"], t["travelers"], t["notes"], trip["id"], uid),
    )
    if "budget" in req.body:
        total = v.money(req.body.get("budget"), "budget")
        db.execute("UPDATE budgets SET total_budget=%s WHERE trip_id=%s", (total, trip["id"]))
    return get_trip(req)


def delete_trip(req):
    uid = req.user["id"]
    trip = owned_trip(uid, v.path_id(req.params["tripId"], "tripId"))
    db.execute("DELETE FROM trips WHERE id=%s AND user_id=%s", (trip["id"], uid))
    return 204, None
