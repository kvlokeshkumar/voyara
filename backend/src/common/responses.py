"""JSON response helpers for API Gateway HTTP API (payload format 2.0)."""
import json
from datetime import date, datetime
from decimal import Decimal


def _default(o):
    if isinstance(o, Decimal):
        # Money has at most 2 decimal places, so float is exact enough for display.
        return float(o)
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    raise TypeError(f"Cannot serialise {type(o).__name__}")


def respond(status, body=None, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    return {
        "statusCode": status,
        "headers": h,
        "body": "" if body is None else json.dumps(body, default=_default),
    }
