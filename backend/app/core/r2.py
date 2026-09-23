"""
Cloudflare R2 storage client.
R2 is S3-compatible, so we use boto3 with a custom endpoint.
"""
import mimetypes
import uuid
from typing import BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings


def _client():
    if not settings.R2_ACCESS_KEY_ID or not settings.R2_SECRET_ACCESS_KEY:
        raise RuntimeError(
            "R2 credentials missing. Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in .env"
        )
    if not settings.R2_ENDPOINT_URL:
        raise RuntimeError("R2_ENDPOINT_URL is missing in .env")

    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def upload_file(
    file_obj: BinaryIO,
    *,
    original_filename: str,
    folder: str = "chats",
    content_type: str | None = None,
) -> dict:
    """
    Upload a file-like object to R2.
    Returns {"key": "...", "url": "...", "size": ...}
    """
    if not content_type:
        content_type = (
            mimetypes.guess_type(original_filename)[0]
            or "application/octet-stream"
        )

    ext = ""
    if "." in original_filename:
        ext = "." + original_filename.rsplit(".", 1)[1].lower()

    key = f"{folder}/{uuid.uuid4().hex}{ext}"

    file_obj.seek(0)
    extra = {"ContentType": content_type}
    # Allow browser to render inline (images, videos, pdfs)
    extra["ContentDisposition"] = f'inline; filename="{original_filename}"'

    try:
        _client().upload_fileobj(
            file_obj,
            settings.R2_BUCKET_NAME,
            key,
            ExtraArgs=extra,
        )
    except ClientError as e:
        raise RuntimeError(f"R2 upload failed: {e}") from e

    # Build public URL
    public_base = settings.R2_PUBLIC_URL.rstrip("/")
    if public_base:
        url = f"{public_base}/{key}"
    else:
        url = f"{settings.R2_ENDPOINT_URL}/{settings.R2_BUCKET_NAME}/{key}"

    return {"key": key, "url": url}


def delete_file(key: str) -> None:
    """Delete an object from R2."""
    try:
        _client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
    except ClientError as e:
        raise RuntimeError(f"R2 delete failed: {e}") from e