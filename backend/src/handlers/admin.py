from common import db
from common.errors import forbidden


def analytics(req):
    # Enforced here on the server: the UI hiding the page is NOT security.
    req.user  # makes sure the caller has a users row (and role is synced from the token)
    if not req.is_admin:
        raise forbidden("Administrator access required")
    totals = db.query(
        "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM trips) AS trips, "
        "(SELECT COALESCE(SUM(total_budget),0) FROM budgets) AS budget, "
        "(SELECT COALESCE(SUM(amount),0) FROM expenses) AS spent, "
        "(SELECT COUNT(*) FROM expenses) AS expenses",
        one=True,
    )
    # NB: literal % must be written %% because PyMySQL treats the query as a format string.
    by_month = db.query(
        "SELECT DATE_FORMAT(created_at, '%%Y-%%m') AS month, COUNT(*) AS trips FROM trips "
        "WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month"
    )
    top = db.query(
        "SELECT destination, COUNT(*) AS trips FROM trips GROUP BY destination "
        "ORDER BY trips DESC, destination LIMIT 5"
    )
    # Aggregates and trip basics only: no user emails, expenses or notes.
    recent = db.query(
        "SELECT t.id, t.origin, t.destination, t.travelers, t.start_date, COALESCE(b.total_budget,0) AS budget "
        "FROM trips t LEFT JOIN budgets b ON b.trip_id = t.id ORDER BY t.created_at DESC, t.id DESC LIMIT 10"
    )
    users = totals["users"]
    return 200, {
        "totalUsers": users,
        "totalTrips": totals["trips"],
        "totalBudget": totals["budget"],
        "totalSpent": totals["spent"],
        "totalExpenses": totals["expenses"],
        "avgTripsPerUser": round(totals["trips"] / users, 1) if users else 0,
        "tripsByMonth": by_month,
        "topDestinations": top,
        "recentTrips": [
            {"id": r["id"], "from": r["origin"], "to": r["destination"], "travelers": r["travelers"],
             "startDate": r["start_date"], "budget": r["budget"]} for r in recent
        ],
    }
