"""MySQL access using PyMySQL.

* One connection is reused across invocations of a warm Lambda container.
* Every query uses %s placeholders; values are never formatted into SQL strings.
"""
import os
from contextlib import contextmanager

import pymysql

_conn = None


def _connect():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        port=int(os.environ.get("DB_PORT", "3306")),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        connect_timeout=int(os.environ.get("DB_CONNECT_TIMEOUT", "5")),
        read_timeout=10,
        write_timeout=10,
    )


def get_conn():
    global _conn
    if _conn is None or not _conn.open:
        _conn = _connect()
    else:
        try:
            _conn.ping(reconnect=False)
        except pymysql.MySQLError:
            _conn = _connect()
    return _conn


def reset():
    """Drop the cached connection (after a connection-level failure, and in tests)."""
    global _conn
    try:
        if _conn is not None:
            _conn.close()
    except Exception:  # noqa: BLE001
        pass
    _conn = None


def query(sql, params=(), one=False):
    with get_conn().cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone() if one else list(cur.fetchall())


def execute(sql, params=()):
    """Run INSERT/UPDATE/DELETE. Returns (last_insert_id, affected_rows)."""
    with get_conn().cursor() as cur:
        cur.execute(sql, params)
        return cur.lastrowid, cur.rowcount


@contextmanager
def transaction():
    """Run several statements atomically. Yields a cursor."""
    conn = get_conn()
    conn.begin()
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
