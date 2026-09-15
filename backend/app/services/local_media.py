"""
Local media scanner.
Strictly whitelisted — only scans directories listed in settings.MEDIA_ROOTS.
"""
import os
import mimetypes
from datetime import datetime
from pathlib import Path
from fastapi import HTTPException

from app.config import settings


AUDIO_EXTENSIONS = {
    ".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg", ".opus", ".wma",
}
VIDEO_EXTENSIONS = {
    ".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".wmv", ".m4v",
}


def _get_roots() -> list[Path]:
    raw = settings.MEDIA_ROOTS or ""
    roots = []
    for r in raw.split(","):
        r = r.strip()
        if not r:
            continue
        p = Path(r).resolve()
        roots.append(p)
    return roots


def list_roots() -> list[dict]:
    """Return metadata about each configured media root."""
    roots = _get_roots()
    result = []
    for p in roots:
        result.append({
            "path": str(p),
            "name": p.name,
            "exists": p.exists() and p.is_dir(),
            "label": p.name or str(p),
        })
    return result


def _is_inside_roots(path: Path, roots: list[Path]) -> bool:
    """Verify path is inside one of the whitelisted roots."""
    try:
        path = path.resolve()
    except (OSError, RuntimeError):
        return False

    for root in roots:
        try:
            path.relative_to(root)
            return True
        except ValueError:
            continue
    return False


def _classify(ext: str) -> str | None:
    ext = ext.lower()
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    if ext in VIDEO_EXTENSIONS:
        return "video"
    return None


def scan_root(
    root_index: int,
    kind: str | None = None,
    max_files: int = 500,
) -> dict:
    """
    Scan a whitelisted root folder and return media files.
    kind: "audio" | "video" | None (both)
    """
    roots = _get_roots()
    if root_index < 0 or root_index >= len(roots):
        raise HTTPException(status_code=404, detail="Root not found")

    root = roots[root_index]
    if not root.exists() or not root.is_dir():
        raise HTTPException(status_code=404, detail="Root directory does not exist")

    files = []
    scanned = 0

    # Walk the folder, but ONLY descend inside this root
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden folders
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        if len(dirnames) > 50:
            dirnames[:] = dirnames[:50]

        for fname in filenames:
            if scanned >= max_files:
                break

            # Skip hidden files
            if fname.startswith("."):
                continue

            full = Path(dirpath) / fname

            # Belt-and-suspenders: verify inside whitelist
            if not _is_inside_roots(full, roots):
                continue

            ext = full.suffix
            file_kind = _classify(ext)
            if not file_kind:
                continue
            if kind and file_kind != kind:
                continue

            try:
                stat = full.stat()
            except OSError:
                continue

            files.append({
                "path": str(full),
                "name": fname,
                "title": full.stem,   # filename without extension
                "kind": file_kind,
                "extension": ext.lower(),
                "size_bytes": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "relative_path": str(full.relative_to(root)),
            })
            scanned += 1

        if scanned >= max_files:
            break

    # Sort newest first
    files.sort(key=lambda f: f["modified_at"], reverse=True)

    return {
        "root": str(root),
        "root_name": root.name,
        "kind_filter": kind,
        "count": len(files),
        "files": files,
    }