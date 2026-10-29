"""Ownership checks and shared queries used by several handlers."""
from decimal import Decimal

from common import db
from common.errors import not_found


def owned_trip(user_id, trip_id):
    """Return the trip only if it belongs to user_id, else 404 (never 403)."""
    trip = db.query(
        "SELECT * FROM trips WHERE id = %s AND user_id = %s", (trip_id, user_id), one=True
    )
    if not trip:
        raise not_found("Trip")
    return trip


def trip_days(trip):
    return (trip["end_date"] - trip["start_date"]).days + 1


def get_budget(trip_id):
    row = db.query("SELECT * FROM budgets WHERE trip_id = %s", (trip_id,), one=True)
    if row is None:
        db.execute("INSERT IGNORE INTO budgets (trip_id) VALUES (%s)", (trip_id,))
        row = db.query("SELECT * FROM budgets WHERE trip_id = %s", (trip_id,), one=True)
    return row


def get_expenses(trip_id):
    return db.query(
        "SELECT id, category, description, amount, expense_date, created_at "
        "FROM expenses WHERE trip_id = %s ORDER BY expense_date DESC, id DESC",
        (trip_id,),
    )


def planned_itinerary_cost(trip_id):
    row = db.query(
        "SELECT COALESCE(SUM(a.planned_cost), 0) AS total "
        "FROM itineraries i JOIN itinerary_activities a ON a.itinerary_id = i.id "
        "WHERE i.trip_id = %s",
        (trip_id,),
        one=True,
    )
    return Decimal(str(row["total"]))


def trip_to_json(t, budget_total=None, spent=None):
    out = {
        "id": t["id"],
        "from": t["origin"],
        "to": t["destination"],
        "startDate": t["start_date"],
        "endDate": t["end_date"],
        "days": trip_days(t),
        "travelers": t["travelers"],
        "notes": t["notes"] or "",
        "createdAt": t["created_at"],
    }
    if budget_total is not None:
        out["budget"] = budget_total
        out["spent"] = spent if spent is not None else Decimal("0.00")
    return out


def budget_to_json(b):
    return {
        "tripId": b["trip_id"],
        "totalBudget": b["total_budget"],
        "transportation": b["transportation"],
        "accommodation": b["accommodation"],
        "meals": b["meals"],
        "activities": b["activities"],
        "miscellaneous": b["miscellaneous"],
        "alertsEnabled": bool(b["alerts_enabled"]),
    }


def expense_to_json(e):
    return {
        "id": e["id"],
        "category": e["category"],
        "description": e["description"],
        "amount": e["amount"],
        "date": e["expense_date"],
    }
