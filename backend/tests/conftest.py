import json
import os

import pymysql
import pytest

TEST_DB = os.environ.get("TEST_DB_NAME", "voyara_test")
HOST = os.environ.get("TEST_DB_HOST", "127.0.0.1")
PORT = int(os.environ.get("TEST_DB_PORT", "3306"))
USER = os.environ.get("TEST_DB_USER", "root")
PASSWORD = os.environ.get("TEST_DB_PASSWORD", "localdev")


@pytest.fixture(scope="session")
def database():
    """Create a clean test database and apply the real migrations via the migrate Lambda."""
    root = pymysql.connect(host=HOST, port=PORT, user=USER, password=PASSWORD, autocommit=True)
    with root.cursor() as c:
        c.execute(f"DROP DATABASE IF EXISTS {TEST_DB}")
        c.execute(f"CREATE DATABASE {TEST_DB} CHARACTER SET utf8mb4")
    root.close()
    os.environ.update(DB_HOST=HOST, DB_PORT=str(PORT), DB_USER=USER, DB_PASSWORD=PASSWORD, DB_NAME=TEST_DB)
    from common import db
    from handlers import migrate

    db.reset()
    result = migrate.lambda_handler({}, None)
    assert result["applied"] == ["V001"]
    yield
    db.reset()


@pytest.fixture
def clean(database):
    from common import db

    db.execute("DELETE FROM users")
    yield


def make_event(method, path, body=None, sub="sub-user-a", email="a@example.com", groups=None, name="Alice"):
    claims = {"sub": sub, "email": email, "name": name}
    if groups:
        claims["cognito:groups"] = "[" + " ".join(groups) + "]"
    return {
        "rawPath": path,
        "requestContext": {"http": {"method": method}, "authorizer": {"jwt": {"claims": claims}}},
        "body": None if body is None else json.dumps(body),
    }


class Client:
    def __init__(self, sub="sub-user-a", email="a@example.com", groups=None):
        self.kw = {"sub": sub, "email": email, "groups": groups}

    def call(self, method, path, body=None):
        import app

        r = app.lambda_handler(make_event(method, path, body, **self.kw), None)
        data = json.loads(r["body"]) if r["body"] else None
        return r["statusCode"], data

    def get(self, p): return self.call("GET", p)
    def post(self, p, b=None): return self.call("POST", p, b)
    def put(self, p, b=None): return self.call("PUT", p, b)
    def delete(self, p): return self.call("DELETE", p)


@pytest.fixture
def alice():
    return Client("sub-user-a", "a@example.com")


@pytest.fixture
def bob():
    return Client("sub-user-b", "b@example.com")


@pytest.fixture
def admin():
    return Client("sub-admin", "admin@example.com", groups=["admins"])


TRIP = {"from": "Chennai", "to": "Bali", "startDate": "2026-12-10", "endDate": "2026-12-14",
        "travelers": 2, "budget": 10000, "notes": "beach"}


@pytest.fixture
def trip_id(alice):
    status, data = alice.post("/trips", TRIP)
    assert status == 201
    return data["id"]
