import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.config import settings
from app.services.local_media import (
    list_media_roots,
    scan_media_files,
)

router = APIRouter(prefix="/media", tags=["media"])


@router.get("/roots")
def get_roots(current_user: User = Depends(get_current_user)):
    """Return all configured media roots with existence flags."""
    return list_media_roots()


@router.get("/scan")
def scan(
    root_index: int,
    kind: str | None = None,
    current_user: User = Depends(get_current_user),
):
    """Scan a media root for audio/video files."""
    return scan_media_files(root_index, kind)


@router.get("/search")
def search_media(
    q: str = Query(..., min_length=1),
    kind: str | None = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    """Search local media by filename across all configured roots."""
    needle = q.strip().lower()
    results: list[dict] = []

    raw = getattr(settings, "MEDIA_ROOTS", "") or ""
    roots = [r.strip() for r in raw.split(",") if r.strip()]

    for idx, _ in enumerate(roots):
        try:
            files = scan_media_files(idx, kind)
        except Exception:
            continue
        for f in files.get("files", []):
            haystack = " ".join(
                str(f.get(k, "")) for k in ("name", "path", "title")
            ).lower()
            if needle in haystack:
                results.append(f)
                if len(results) >= limit:
                    return {"query": q, "count": len(results), "results": results}

    return {"query": q, "count": len(results), "results": results}


@router.get("/file")
def stream_file(
    path: str,
    current_user: User = Depends(get_current_user),
):
    """Stream a local media file by relative path."""
    raw = getattr(settings, "MEDIA_ROOTS", "") or ""
    roots = [
        Path(r.strip()).expanduser().resolve()
        for r in raw.split(",")
        if r.strip()
    ]
    if not roots:
        raise HTTPException(500, "No media roots configured")

    target: Path | None = None
    for root in roots:
        candidate = (root / path).resolve()
        try:
            candidate.relative_to(root)   # path traversal guard
        except ValueError:
            continue
        if candidate.exists() and candidate.is_file():
            target = candidate
            break

    if target is None:
        raise HTTPException(404, "File not found")

    suffix = target.suffix.lower()
    media_types = {
        ".mp3": "audio/mpeg",
        ".m4a": "audio/mp4",
        ".wav": "audio/wav",
        ".flac": "audio/flac",
        ".ogg": "audio/ogg",
        ".aac": "audio/aac",
        ".mp4": "video/mp4",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
    }
    return FileResponse(
        str(target),
        media_type=media_types.get(suffix, "application/octet-stream"),
        filename=target.name,
    )