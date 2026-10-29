"""Identity comes ONLY from the verified Cognito JWT.

API Gateway's JWT authorizer validates the token signature, issuer, audience and
expiry before Lambda runs. We read the verified claims from the request context.
Nothing in the request body, query string or headers is ever used as a user id.
"""
from . import db
from .errors import ApiError


def claims(event):
    try:
        return event["requestContext"]["authorizer"]["jwt"]["claims"]
    except (KeyError, TypeError):
        raise ApiError(401, "unauthorized", "Missing or invalid credentials")


def _groups(c):
    raw = c.get("cognito:groups", "")
    if isinstance(raw, list):
        return [str(g) for g in raw]
    # HTTP API renders arrays as "[admins other]" or "admins"
    return str(raw).replace("[", " ").replace("]", " ").replace(",", " ").split()


def is_admin(event):
    return "admins" in _groups(claims(event))


def current_user(event):
    """Return {id, sub, email, name, is_admin}; creates the DB row on first sight."""
    c = claims(event)
    sub = c.get("sub")
    if not sub:
        raise ApiError(401, "unauthorized", "Token has no subject")
    email = c.get("email") or f"{sub}@unknown.invalid"
    name = c.get("name") or None
    admin = "admins" in _groups(c)
    db.execute(
        "INSERT INTO users (cognito_sub, email, name, role) VALUES (%s, %s, %s, %s) "
        "ON DUPLICATE KEY UPDATE email = VALUES(email), "
        "name = COALESCE(VALUES(name), name), role = VALUES(role)",
        (sub, email[:255], name[:120] if name else None, "admin" if admin else "user"),
    )
    row = db.query("SELECT id FROM users WHERE cognito_sub = %s", (sub,), one=True)
    return {"id": row["id"], "sub": sub, "email": email, "name": name, "is_admin": admin}
