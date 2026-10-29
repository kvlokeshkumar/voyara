"""Input validation. Every function raises ApiError(400) naming the offending field."""
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from .errors import bad_request

CATEGORIES = ("transportation", "accommodation", "meals", "activities", "miscellaneous")
MAX_MONEY = Decimal("99999999.99")
_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def money(value, field, default=None):
    if value is None or value == "":
        if default is not None:
            return default
        raise bad_request(f"{field} is required", field)
    if isinstance(value, bool):
        raise bad_request(f"{field} must be a number", field)
    try:
        d = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise bad_request(f"{field} must be a number", field)
    if not d.is_finite():
        raise bad_request(f"{field} must be a number", field)
    if d < 0:
        raise bad_request(f"{field} cannot be negative", field)
    if d > MAX_MONEY:
        raise bad_request(f"{field} is too large", field)
    return d.quantize(Decimal("0.01"))


def text(value, field, max_len=255, required=True):
    if value is None or (isinstance(value, str) and value.strip() == ""):
        if required:
            raise bad_request(f"{field} is required", field)
        return None
    if not isinstance(value, str):
        raise bad_request(f"{field} must be text", field)
    value = value.strip()
    if len(value) > max_len:
        raise bad_request(f"{field} must be at most {max_len} characters", field)
    return value


def to_date(value, field):
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        raise bad_request(f"{field} must be a date (YYYY-MM-DD)", field)
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        raise bad_request(f"{field} must be a date (YYYY-MM-DD)", field)


def integer(value, field, minimum=1, maximum=1000, default=None):
    if value is None or value == "":
        if default is not None:
            return default
        raise bad_request(f"{field} is required", field)
    if isinstance(value, bool):
        raise bad_request(f"{field} must be a whole number", field)
    try:
        n = int(str(value))
    except ValueError:
        raise bad_request(f"{field} must be a whole number", field)
    if n < minimum or n > maximum:
        raise bad_request(f"{field} must be between {minimum} and {maximum}", field)
    return n


def choice(value, field, allowed):
    if value not in allowed:
        raise bad_request(f"{field} must be one of: {', '.join(allowed)}", field)
    return value


def clock_time(value, field):
    if value is None or value == "":
        return None
    if not isinstance(value, str) or not _TIME_RE.match(value):
        raise bad_request(f"{field} must be HH:MM", field)
    return value


def path_id(value, field="id"):
    try:
        n = int(value)
    except (TypeError, ValueError):
        raise bad_request(f"{field} must be a number", field)
    if n < 1 or n > 2**63 - 1:
        raise bad_request(f"{field} must be a positive number", field)
    return n
