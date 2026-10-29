import re
from collections import defaultdict
from decimal import Decimal

from common import db, validation as v
from common.errors import bad_request
from .common_queries import owned_trip, trip_days

_DAY_RE = re.compile(r"^day(\d{1,3})$")
MAX_ACTIVITIES = 500


def _load(trip):
    rows = db.query(
        "SELECT a.id, a.day_number, a.activity_time, a.title, a.planned_cost "
        "FROM itineraries i JOIN itinerary_activities a ON a.itinerary_id = i.id "
        "WHERE i.trip_id = %s ORDER BY a.day_number, a.sort_order, a.id",
        (trip["id"],),
    )
    days = defaultdict(list)
    total = Decimal("0.00")
    for r in rows:
        days[f"day{r['day_number']}"].append(
            {"id": r["id"], "time": r["activity_time"] or "", "activity": r["title"], "cost": r["planned_cost"]}
        )
        total += Decimal(str(r["planned_cost"]))
    return {"tripId": trip["id"], "totalDays": trip_days(trip), "days": dict(days), "totalPlanned": total}


def get(req):
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    return 200, _load(trip)


def put(req):
    """Replace the whole itinerary atomically."""
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    days = req.body.get("days")
    if not isinstance(days, dict):
        raise bad_request("days must be an object like {\"day1\": [...]}", "days")
    max_day = trip_days(trip)
    rows = []
    for key, acts in days.items():
        m = _DAY_RE.match(key)
        if not m:
            raise bad_request(f"Invalid day key '{key}'", "days")
        n = int(m.group(1))
        if n < 1 or n > max_day:
            raise bad_request(f"{key} is outside this trip's {max_day} days", "days")
        if not isinstance(acts, list):
            raise bad_request(f"{key} must be a list", "days")
        for order, a in enumerate(acts):
            if not isinstance(a, dict):
                raise bad_request("Each activity must be an object", "days")
            rows.append((
                n,
                v.clock_time(a.get("time"), "time"),
                v.text(a.get("activity"), "activity", 255),
                v.money(a.get("cost", 0) or 0, "cost"),
                order,
            ))
    if len(rows) > MAX_ACTIVITIES:
        raise bad_request(f"At most {MAX_ACTIVITIES} activities per trip", "days")
    with db.transaction() as cur:
        cur.execute("INSERT IGNORE INTO itineraries (trip_id) VALUES (%s)", (trip["id"],))
        cur.execute("SELECT id FROM itineraries WHERE trip_id = %s", (trip["id"],))
        itin_id = cur.fetchone()["id"]
        cur.execute("DELETE FROM itinerary_activities WHERE itinerary_id = %s", (itin_id,))
        if rows:
            cur.executemany(
                "INSERT INTO itinerary_activities "
                "(itinerary_id, day_number, activity_time, title, planned_cost, sort_order) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                [(itin_id, *r) for r in rows],
            )
    return 200, _load(trip)
