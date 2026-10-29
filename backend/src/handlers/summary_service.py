from common import calculations as calc
from .common_queries import get_budget, get_expenses, planned_itinerary_cost


def summary_for_trip(trip):
    return calc.build_summary(
        trip, get_budget(trip["id"]), get_expenses(trip["id"]), planned_itinerary_cost(trip["id"])
    )
