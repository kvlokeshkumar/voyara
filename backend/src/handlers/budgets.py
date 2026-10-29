from common import db, validation as v
from .common_queries import budget_to_json, get_budget, owned_trip


def get(req):
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    return 200, budget_to_json(get_budget(trip["id"]))


def put(req):
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    b = req.body
    vals = [v.money(b.get(k, 0), k) for k in ("totalBudget",) + v.CATEGORIES]
    alerts = 1 if b.get("alertsEnabled") is True else 0
    db.execute(
        "INSERT INTO budgets (trip_id, total_budget, transportation, accommodation, meals, "
        "activities, miscellaneous, alerts_enabled) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) "
        "ON DUPLICATE KEY UPDATE total_budget=VALUES(total_budget), transportation=VALUES(transportation), "
        "accommodation=VALUES(accommodation), meals=VALUES(meals), activities=VALUES(activities), "
        "miscellaneous=VALUES(miscellaneous), alerts_enabled=VALUES(alerts_enabled)",
        (trip["id"], *vals, alerts),
    )
    return 200, budget_to_json(get_budget(trip["id"]))
