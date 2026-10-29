"""Lambda entry point and router for the Voyara HTTP API.

API Gateway uses one proxy route (ANY /{proxy+}) protected by the Cognito JWT authorizer;
this module maps method + path to a handler.
"""
import json
import logging
import re
import time

import pymysql

from common import db
from common.errors import ApiError
from common.request import Request
from common.responses import respond
from handlers import admin, budgets, expenses, itinerary, reports, summary, trips

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def me(req):
    u = req.user
    return 200, {"email": u["email"], "name": u["name"], "isAdmin": u["is_admin"]}


def _r(method, pattern, fn):
    return method, re.compile("^" + re.sub(r"\{(\w+)\}", r"(?P<\1>[^/]+)", pattern) + "$"), fn


ROUTES = [
    _r("GET", "/me", me),
    _r("GET", "/dashboard", summary.dashboard),
    _r("GET", "/trips", trips.list_trips),
    _r("POST", "/trips", trips.create_trip),
    _r("GET", "/trips/{tripId}", trips.get_trip),
    _r("PUT", "/trips/{tripId}", trips.update_trip),
    _r("DELETE", "/trips/{tripId}", trips.delete_trip),
    _r("GET", "/trips/{tripId}/budget", budgets.get),
    _r("PUT", "/trips/{tripId}/budget", budgets.put),
    _r("GET", "/trips/{tripId}/expenses", expenses.list_expenses),
    _r("POST", "/trips/{tripId}/expenses", expenses.create_expense),
    _r("PUT", "/expenses/{expenseId}", expenses.update_expense),
    _r("DELETE", "/expenses/{expenseId}", expenses.delete_expense),
    _r("GET", "/trips/{tripId}/itinerary", itinerary.get),
    _r("PUT", "/trips/{tripId}/itinerary", itinerary.put),
    _r("GET", "/trips/{tripId}/summary", summary.trip_summary),
    _r("GET", "/trips/{tripId}/threshold", summary.trip_threshold),
    _r("POST", "/trips/{tripId}/reports", reports.create_report),
    _r("GET", "/admin/analytics", admin.analytics),
]


def _match(method, path):
    path_found = False
    for m, rx, fn in ROUTES:
        hit = rx.match(path)
        if hit:
            path_found = True
            if m == method:
                return fn, hit.groupdict()
    if path_found:
        raise ApiError(405, "method_not_allowed", "Method not allowed")
    raise ApiError(404, "route_not_found", "Route not found")


def lambda_handler(event, context):
    started = time.time()
    http = (event.get("requestContext") or {}).get("http") or {}
    method = http.get("method") or event.get("httpMethod", "GET")
    path = (event.get("rawPath") or event.get("path") or "/").rstrip("/") or "/"
    status = 500
    try:
        if method == "OPTIONS":
            status, resp = 204, respond(204)
            return resp
        fn, params = _match(method, path)
        code, body = fn(Request(event, params))
        status = code
        return respond(code, body)
    except ApiError as e:
        status = e.status
        return respond(e.status, e.to_body())
    except (pymysql.err.OperationalError, pymysql.err.InterfaceError):
        db.reset()
        logger.exception("database connection problem")
        status = 503
        return respond(503, {"error": {"code": "db_unavailable", "message": "Service temporarily unavailable"}})
    except Exception:  # noqa: BLE001
        logger.exception("unhandled error")
        status = 500
        return respond(500, {"error": {"code": "internal_error", "message": "Something went wrong"}})
    finally:
        logger.info(json.dumps({
            "msg": "request", "method": method, "path": path, "status": status,
            "ms": int((time.time() - started) * 1000),
            "requestId": getattr(context, "aws_request_id", None),
        }))
