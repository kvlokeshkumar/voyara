from datetime import date

from common import alerts, calculations as calc, db, validation as v
from common.errors import not_found
from .common_queries import expense_to_json, get_expenses, owned_trip
from .summary_service import summary_for_trip


def _parse(body):
    amount = v.money(body.get("amount"), "amount")
    if amount <= 0:
        from common.errors import bad_request
        raise bad_request("amount must be greater than 0", "amount")
    return {
        "category": v.choice(body.get("category"), "category", v.CATEGORIES),
        "description": v.text(body.get("description"), "description", 255),
        "amount": amount,
        "date": v.to_date(body["date"], "date") if body.get("date") else date.today(),
    }


def _threshold(summary):
    return {
        "status": summary["status"],
        "percentUsed": summary["percentUsed"],
        "totalSpent": summary["totalSpent"],
        "remaining": summary["remaining"],
    }


def _after_write(req, trip, before_status):
    """Recompute totals; send an SNS alert only when the status gets worse."""
    summary = summary_for_trip(trip)
    level = calc.crossed_threshold(before_status, summary["status"])
    if level:
        alerts_on = db.query(
            "SELECT alerts_enabled FROM budgets WHERE trip_id = %s", (trip["id"],), one=True
        )
        if alerts_on and alerts_on["alerts_enabled"]:
            alerts.notify(level, summary, trip, req.user["email"])
    return summary


def list_expenses(req):
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    return 200, [expense_to_json(e) for e in get_expenses(trip["id"])]


def create_expense(req):
    uid = req.user["id"]
    trip = owned_trip(uid, v.path_id(req.params["tripId"], "tripId"))
    e = _parse(req.body)
    before = summary_for_trip(trip)["status"]
    new_id, _ = db.execute(
        "INSERT INTO expenses (trip_id, user_id, category, description, amount, expense_date) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (trip["id"], uid, e["category"], e["description"], e["amount"], e["date"]),
    )
    summary = _after_write(req, trip, before)
    row = db.query("SELECT * FROM expenses WHERE id = %s", (new_id,), one=True)
    return 201, {"expense": expense_to_json(row), "threshold": _threshold(summary)}


def _owned_expense(uid, expense_id):
    row = db.query("SELECT * FROM expenses WHERE id = %s AND user_id = %s", (expense_id, uid), one=True)
    if not row:
        raise not_found("Expense")
    return row


def update_expense(req):
    uid = req.user["id"]
    exp = _owned_expense(uid, v.path_id(req.params["expenseId"], "expenseId"))
    trip = owned_trip(uid, exp["trip_id"])
    e = _parse(req.body)
    before = summary_for_trip(trip)["status"]
    db.execute(
        "UPDATE expenses SET category=%s, description=%s, amount=%s, expense_date=%s "
        "WHERE id=%s AND user_id=%s",
        (e["category"], e["description"], e["amount"], e["date"], exp["id"], uid),
    )
    summary = _after_write(req, trip, before)
    row = db.query("SELECT * FROM expenses WHERE id = %s", (exp["id"],), one=True)
    return 200, {"expense": expense_to_json(row), "threshold": _threshold(summary)}


def delete_expense(req):
    uid = req.user["id"]
    exp = _owned_expense(uid, v.path_id(req.params["expenseId"], "expenseId"))
    db.execute("DELETE FROM expenses WHERE id=%s AND user_id=%s", (exp["id"], uid))
    return 204, None
