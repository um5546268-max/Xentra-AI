# app/services/local_media.py
import os
from pathlib import Path
from typing import Any

from app.config import settings


def _get_roots() -> list[Path]:
    raw = getattr(settings, "MEDIA_ROOTS", "") or ""
    return [
        Path(r.strip()).expanduser().resolve()
        for r in raw.split(",")
        if r.strip()
    ]


def list_media_roots():
    raw = getattr(settings, "MEDIA_ROOTS", "") or ""
    roots = []
    for r in raw.split(","):
        r = r.strip()
        if not r:
            continue
        p = Path(r).expanduser().resolve()
        roots.append({
            "path": str(p),
            "name": p.name,
            "exists": p.exists(),
            "label": p.name,
        })
    return roots


AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".flac", ".ogg", ".aac"}
VIDEO_EXTS = {".mp4", ".mkv", ".webm", ".mov", ".avi"}


def scan_media_files(root_index: int, kind: str | None = None) -> dict:
    """
    Walk a media root and return audio/video files.
    kind: 'audio' | 'video' | None (both)
    """
    roots = _get_roots()
    if root_index < 0 or root_index >= len(roots):
        return {"files": []}

    root = roots[root_index]
    if not root.exists() or not root.is_dir():
        return {"files": []}

    files = []
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            p = Path(dirpath) / name
            ext = p.suffix.lower()
            is_audio = ext in AUDIO_EXTS
            is_video = ext in VIDEO_EXTS

            if not (is_audio or is_video):
                continue
            if kind == "audio" and not is_audio:
                continue
            if kind == "video" and not is_video:
                continue

            try:
                size = p.stat().st_size
            except OSError:
                size = 0

            files.append({
                "title": p.stem,
                "relative_path": str(p.relative_to(root)),
                "absolute_path": str(p),
                "kind": "audio" if is_audio else "video",
                "size_bytes": size,
            })

    return {"files": files}