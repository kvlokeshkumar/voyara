from decimal import Decimal

from common import db, validation as v
from .common_queries import owned_trip
from .summary_service import summary_for_trip


def trip_summary(req):
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    return 200, summary_for_trip(trip)


def trip_threshold(req):
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    s = summary_for_trip(trip)
    return 200, {
        "tripId": trip["id"],
        "status": s["status"],
        "percentUsed": s["percentUsed"],
        "warnAt": 80,
        "exceedAt": 100,
        "totalBudget": s["totalBudget"],
        "totalSpent": s["totalSpent"],
        "remaining": s["remaining"],
    }


def dashboard(req):
    uid = req.user["id"]
    row = db.query(
        "SELECT COUNT(*) AS trips, COALESCE(SUM(b.total_budget), 0) AS planned FROM trips t "
        "LEFT JOIN budgets b ON b.trip_id = t.id WHERE t.user_id = %s",
        (uid,),
        one=True,
    )
    spent = db.query(
        "SELECT COALESCE(SUM(amount), 0) AS s FROM expenses WHERE user_id = %s", (uid,), one=True
    )["s"]
    cats = db.query(
        "SELECT category, SUM(amount) AS total FROM expenses WHERE user_id = %s GROUP BY category", (uid,)
    )
    per_trip = db.query(
        "SELECT b.total_budget, COALESCE(SUM(e.amount), 0) AS spent FROM trips t "
        "JOIN budgets b ON b.trip_id = t.id LEFT JOIN expenses e ON e.trip_id = t.id "
        "WHERE t.user_id = %s GROUP BY t.id, b.total_budget",
        (uid,),
    )
    from common.calculations import threshold_status
    statuses = [threshold_status(r["total_budget"], r["spent"]) for r in per_trip]
    planned = Decimal(str(row["planned"]))
    spent = Decimal(str(spent))
    return 200, {
        "totalTrips": row["trips"],
        "plannedBudget": planned,
        "actualSpending": spent,
        "remainingBudget": planned - spent,
        "tripsInWarning": statuses.count("warning"),
        "tripsExceeded": statuses.count("exceeded"),
        "byCategory": {c["category"]: c["total"] for c in cats},
    }
