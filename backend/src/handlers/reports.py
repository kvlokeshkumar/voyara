import os
from datetime import datetime, timezone

from common import aws, report_builder, validation as v
from common.errors import ApiError, bad_request
from .common_queries import get_expenses, owned_trip, planned_itinerary_cost
from .summary_service import summary_for_trip

URL_TTL_SECONDS = 300
_TYPES = {"csv": "text/csv; charset=utf-8", "pdf": "application/pdf"}


def create_report(req):
    """Build a CSV/PDF report, store it in S3 under the caller's own prefix, return a short-lived URL."""
    trip = owned_trip(req.user["id"], v.path_id(req.params["tripId"], "tripId"))
    fmt = req.body.get("format", "csv")
    if fmt not in _TYPES:
        raise bad_request("format must be 'csv' or 'pdf'", "format")
    bucket = os.environ.get("REPORT_BUCKET")
    if not bucket:
        raise ApiError(503, "not_configured", "Report storage is not configured")

    summary = summary_for_trip(trip)
    expenses = get_expenses(trip["id"])
    planned = planned_itinerary_cost(trip["id"])
    builder = report_builder.build_csv if fmt == "csv" else report_builder.build_pdf
    data = builder(trip, summary, expenses, planned)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    key = f"reports/{req.user['sub']}/{trip['id']}/trip-{trip['id']}-{stamp}.{fmt}"
    s3 = aws.get_s3()
    s3.put_object(
        Bucket=bucket, Key=key, Body=data, ContentType=_TYPES[fmt],
        ServerSideEncryption="AES256",
    )
    url = s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket, "Key": key,
            "ResponseContentDisposition": f'attachment; filename="voyara-trip-{trip["id"]}.{fmt}"',
        },
        ExpiresIn=URL_TTL_SECONDS,
    )
    return 201, {"format": fmt, "bucket": bucket, "key": key, "size": len(data),
                 "downloadUrl": url, "expiresInSeconds": URL_TTL_SECONDS}
