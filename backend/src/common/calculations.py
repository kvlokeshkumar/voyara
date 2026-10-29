"""Pure budget maths (no database, no AWS) so it is easy to unit-test."""
from decimal import Decimal

from .validation import CATEGORIES

ZERO = Decimal("0.00")
WARN_PERCENT = Decimal("80")
EXCEEDED_PERCENT = Decimal("100")


def total_spent(expenses):
    return sum((Decimal(str(e["amount"])) for e in expenses), ZERO)


def remaining(budget, spent):
    return Decimal(str(budget)) - Decimal(str(spent))


def percent_used(budget, spent):
    budget, spent = Decimal(str(budget)), Decimal(str(spent))
    if budget <= 0:
        return Decimal("0.0")
    return (spent / budget * 100).quantize(Decimal("0.1"))


def threshold_status(budget, spent):
    """'no_budget' | 'ok' | 'warning' (>=80%) | 'exceeded' (>=100%)."""
    budget, spent = Decimal(str(budget)), Decimal(str(spent))
    if budget <= 0:
        return "no_budget"
    pct = spent / budget * 100
    if pct >= EXCEEDED_PERCENT:
        return "exceeded"
    if pct >= WARN_PERCENT:
        return "warning"
    return "ok"


def by_category(expenses):
    out = {c: ZERO for c in CATEGORIES}
    for e in expenses:
        out[e["category"]] = out.get(e["category"], ZERO) + Decimal(str(e["amount"]))
    return out


def crossed_threshold(before, after):
    """Return the new alert level if the status got worse, else None."""
    order = {"no_budget": 0, "ok": 0, "warning": 1, "exceeded": 2}
    if order[after] > order[before]:
        return after
    return None


def build_summary(trip, budget, expenses, planned_itinerary_cost):
    spent = total_spent(expenses)
    cats = by_category(expenses)
    total = Decimal(str(budget["total_budget"]))
    categories = {}
    for c in CATEGORIES:
        cat_budget = Decimal(str(budget[c]))
        cat_spent = cats[c]
        categories[c] = {
            "budget": cat_budget,
            "spent": cat_spent,
            "percentUsed": percent_used(cat_budget, cat_spent),
            "over": cat_budget > 0 and cat_spent > cat_budget,
        }
    planned = Decimal(str(planned_itinerary_cost))
    return {
        "tripId": trip["id"],
        "destination": trip["destination"],
        "currency": "INR",
        "totalBudget": total,
        "totalSpent": spent,
        "remaining": remaining(total, spent),
        "percentUsed": percent_used(total, spent),
        "status": threshold_status(total, spent),
        "expenseCount": len(expenses),
        "byCategory": categories,
        "plannedVsActual": {
            "planned": planned,
            "actual": spent,
            "difference": planned - spent,
        },
    }
