"""Lazy AWS clients. IAM role credentials come from the Lambda runtime (no keys in code)."""
import os

_s3 = None
_sns = None


def region():
    return os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "ap-south-1"


def get_s3():
    global _s3
    if _s3 is None:
        import boto3
        from botocore.config import Config

        _s3 = boto3.client(
            "s3",
            region_name=region(),
            config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
        )
    return _s3


def get_sns():
    """Short timeouts: a VPC Lambda without an SNS endpoint must fail fast, not hang."""
    global _sns
    if _sns is None:
        import boto3
        from botocore.config import Config

        _sns = boto3.client(
            "sns",
            region_name=region(),
            config=Config(connect_timeout=2, read_timeout=3, retries={"max_attempts": 1}),
        )
    return _sns
