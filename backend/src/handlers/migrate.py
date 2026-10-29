"""One-off Lambda that prepares the database from inside the VPC (RDS stays private).

It (1) creates the database if missing, (2) applies versioned SQL files once each,
(3) creates a least-privilege application user when APP_DB_USER differs from DB_USER.

Invoke:  aws lambda invoke --function-name voyara-api-migrate --payload '{}' --cli-binary-format raw-in-base64-out out.json
Seed:    --payload '{"include_seed": true}'   (fake test data; skip it for a real demo account)
"""
import os
import re

import pymysql

from common import db

BASE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "migrations")
_IDENT = re.compile(r"^[A-Za-z0-9_]{1,32}$")


def _statements(sql):
    sql = "\n".join(l for l in sql.splitlines() if not l.strip().startswith("--"))
    return [s.strip() for s in re.split(r";\s*(?:\n|$)", sql) if s.strip()]


def _files(include_seed):
    names = sorted(f for f in os.listdir(BASE) if re.match(r"^V\d+__.*\.sql$", f))
    files = [os.path.join(BASE, n) for n in names]
    if include_seed:
        seed = os.path.join(BASE, "seed")
        files += [os.path.join(seed, n) for n in sorted(os.listdir(seed)) if n.endswith(".sql")]
    return files


def _ensure_database():
    name = os.environ["DB_NAME"]
    if not _IDENT.match(name):
        raise ValueError("DB_NAME may only contain letters, digits and underscores")
    conn = pymysql.connect(
        host=os.environ["DB_HOST"], port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
        charset="utf8mb4", autocommit=True, connect_timeout=10,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{name}` CHARACTER SET utf8mb4")
    finally:
        conn.close()


def _ensure_app_user():
    user, password = os.environ.get("APP_DB_USER"), os.environ.get("APP_DB_PASSWORD")
    if not user or not password or user == os.environ["DB_USER"]:
        return None
    if not _IDENT.match(user):
        raise ValueError("APP_DB_USER may only contain letters, digits and underscores")
    name = os.environ["DB_NAME"]
    # CREATE USER cannot use server-side placeholders; PyMySQL escapes these client-side.
    db.execute("CREATE USER IF NOT EXISTS %s@'%%' IDENTIFIED BY %s", (user, password))
    db.execute("ALTER USER %s@'%%' IDENTIFIED BY %s", (user, password))
    db.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON `{name}`.* TO %s@'%%'", (user,))
    return user


def lambda_handler(event, context):
    include_seed = bool((event or {}).get("include_seed"))
    _ensure_database()
    db.reset()
    db.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations ("
        "version VARCHAR(40) NOT NULL PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)"
    )
    done = {r["version"] for r in db.query("SELECT version FROM schema_migrations")}
    applied = []
    for path in _files(include_seed):
        version = os.path.basename(path).split("__")[0]
        if version in done:
            continue
        with open(path, encoding="utf-8") as fh:
            for stmt in _statements(fh.read()):
                db.execute(stmt)
        db.execute("INSERT IGNORE INTO schema_migrations (version) VALUES (%s)", (version,))
        applied.append(version)
    return {"applied": applied, "alreadyApplied": sorted(done), "appUser": _ensure_app_user()}
