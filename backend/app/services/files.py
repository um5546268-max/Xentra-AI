import os
import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile
from app.config import settings


ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".odt", ".rtf",
    ".txt", ".md", ".rst",
    ".csv", ".tsv",
    ".xls", ".xlsx", ".ods",
    ".ppt", ".pptx", ".odp",
    ".json", ".yaml", ".yml", ".xml",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go",
    ".rs", ".c", ".cpp", ".h", ".rb", ".php", ".swift",
    ".html", ".css", ".sql", ".sh",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
}

ALLOWED_MIME_PREFIXES = (
    "text/", "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats",
    "application/vnd.ms-",
    "application/vnd.oasis",
    "image/", "application/json", "application/xml",
    "application/yaml", "application/x-yaml",
)


def _upload_dir() -> Path:
    p = Path(settings.UPLOAD_DIR).expanduser().resolve()
    p.mkdir(parents=True, exist_ok=True)
    return p


def _user_dir(user_id: str) -> Path:
    p = _upload_dir() / str(user_id)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _safe_stored_name(original_name: str) -> str:
    ext = Path(original_name).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


def validate_upload(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a name")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"File type '{ext}' not supported")


def save_upload(user_id: str, file: UploadFile) -> dict:
    validate_upload(file)
    user_dir = _user_dir(user_id)
    stored_name = _safe_stored_name(file.filename or "file")
    dest = user_dir / stored_name
    total = 0
    max_size = settings.MAX_UPLOAD_SIZE

    try:
        with dest.open("wb") as out:
            while True:
                chunk = file.file.read(1024 * 256)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_size:
                    out.close()
                    dest.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail=f"File too large (max {max_size // 1024 // 1024} MB)")
                out.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    ext = Path(file.filename or "").suffix.lower()
    return {
        "original_name": file.filename or "file",
        "stored_name": stored_name,
        "path": str(dest),
        "mime_type": file.content_type,
        "extension": ext,
        "size_bytes": total,
    }


def delete_file_on_disk(user_id: str, stored_name: str) -> bool:
    user_dir = _user_dir(user_id)
    path = user_dir / stored_name
    try:
        path = path.resolve()
        path.relative_to(user_dir.resolve())
    except (ValueError, OSError):
        return False
    try:
        if path.exists():
            path.unlink()
            return True
    except Exception:
        return False
    return False


def get_file_path(user_id: str, stored_name: str) -> Path | None:
    user_dir = _user_dir(user_id)
    path = user_dir / stored_name
    try:
        path = path.resolve()
        path.relative_to(user_dir.resolve())
    except (ValueError, OSError):
        return None
    if path.exists() and path.is_file():
        return path
    return None