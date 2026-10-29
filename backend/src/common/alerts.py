"""Optional spending alerts via Amazon SNS. Never breaks the API call that triggered it."""
import logging
import os

from . import aws

log = logging.getLogger(__name__)

SUBJECTS = {
    "warning": "Voyara: 80% of your trip budget used",
    "exceeded": "Voyara: trip budget exceeded",
}


def notify(level, summary, trip, user_email):
    topic = os.environ.get("ALERT_TOPIC_ARN", "")
    if not topic or level not in SUBJECTS:
        return False
    message = (
        f"Trip to {trip['destination']} (from {trip['origin']})\n"
        f"Account: {user_email}\n"
        f"Budget: INR {summary['totalBudget']}\n"
        f"Spent: INR {summary['totalSpent']} ({summary['percentUsed']}%)\n"
        f"Remaining: INR {summary['remaining']}\n"
    )
    try:
        aws.get_sns().publish(TopicArn=topic, Subject=SUBJECTS[level][:100], Message=message)
        return True
    except Exception:  # noqa: BLE001 - alerts are best-effort
        log.warning("SNS publish failed (is there a route/endpoint to SNS?)", exc_info=True)
        return False
