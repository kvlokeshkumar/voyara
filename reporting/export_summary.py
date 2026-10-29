#!/usr/bin/env python3
"""Optional EC2 reporting utility.

Reads aggregated per-trip spending from RDS (read-only DB user recommended), writes a CSV,
uploads it to S3 and optionally publishes an SNS alert for trips over their budget.
AWS access comes from the instance's IAM role (no keys). DB settings come from environment variables.

  DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=voyara REPORT_BUCKET=... python3 export_summary.py
  python3 export_summary.py --local-only        # just write the CSV file, no AWS calls
"""
import argparse
import csv
import datetime as dt
import os
import sys

import pymysql

SQL = """
SELECT t.id AS trip_id, t.destination, t.start_date, t.end_date, t.travelers,
       COALESCE(b.total_budget, 0) AS budget,
       COALESCE(SUM(e.amount), 0) AS spent,
       COUNT(e.id) AS expenses
FROM trips t
LEFT JOIN budgets b ON b.trip_id = t.id
LEFT JOIN expenses e ON e.trip_id = t.id
GROUP BY t.id, t.destination, t.start_date, t.end_date, t.travelers, b.total_budget
ORDER BY t.id
"""


def fetch():
    conn = pymysql.connect(
        host=os.environ["DB_HOST"], user=os.environ["DB_USER"], password=os.environ["DB_PASSWORD"],
        database=os.environ.get("DB_NAME", "voyara"), port=int(os.environ.get("DB_PORT", "3306")),
        charset="utf8mb4", cursorclass=pymysql.cursors.DictCursor, connect_timeout=10,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(SQL)
            return cur.fetchall()
    finally:
        conn.close()


def write_csv(rows, path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["trip_id", "destination", "start_date", "end_date", "travelers",
                    "budget_inr", "spent_inr", "percent_used", "expenses"])
        for r in rows:
            pct = round(float(r["spent"]) / float(r["budget"]) * 100, 1) if r["budget"] else 0
            w.writerow([r["trip_id"], r["destination"], r["start_date"], r["end_date"], r["travelers"],
                        r["budget"], r["spent"], pct, r["expenses"]])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local-only", action="store_true")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = args.out or f"/tmp/voyara-summary-{stamp}.csv"
    rows = fetch()
    write_csv(rows, path)
    print(f"Wrote {len(rows)} trips to {path}")
    if args.local_only:
        return 0
    import boto3

    bucket = os.environ["REPORT_BUCKET"]
    key = f"reports/admin/summary-{stamp}.csv"
    boto3.client("s3").upload_file(path, bucket, key, ExtraArgs={"ServerSideEncryption": "AES256"})
    print(f"Uploaded s3://{bucket}/{key}")
    topic = os.environ.get("ALERT_TOPIC_ARN")
    over = [r for r in rows if r["budget"] and r["spent"] >= r["budget"]]
    if topic and over:
        lines = [f"Trip {r['trip_id']} {r['destination']}: spent {r['spent']} of {r['budget']}" for r in over]
        boto3.client("sns").publish(TopicArn=topic, Subject="Voyara: trips over budget", Message="\n".join(lines))
        print(f"Published SNS alert for {len(over)} trip(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
