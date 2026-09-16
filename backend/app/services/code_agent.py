"""
Code agent service — safe file operations inside a whitelisted workspace.
Every path is resolved and checked against the workspace root.
"""
import os
import re
from pathlib import Path
from datetime import datetime
from fastapi import HTTPException

from app.config import settings


# File types we allow
TEXT_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss",
    ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env",
    ".md", ".txt", ".rst", ".csv", ".tsv",
    ".java", ".go", ".rs", ".c", ".cpp", ".h", ".hpp",
    ".rb", ".php", ".swift", ".kt", ".scala", ".sh", ".bash",
    ".sql", ".xml", ".gitignore", ".dockerfile",
}

# Folders we never descend into
SKIP_FOLDERS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    ".next", "dist", "build", ".cache", ".idea", ".vscode",
    "coverage", ".pytest_cache", ".mypy_cache",
}

# Max entries returned from a tree call
MAX_TREE_ENTRIES = 500


def _workspace_root() -> Path:
    """Get the workspace root, creating it if needed."""
    root_str = settings.CODE_WORKSPACE
    if not root_str:
        raise HTTPException(
            status_code=500,
            detail="CODE_WORKSPACE not configured. Add it to backend/.env",
        )
    root = Path(root_str).expanduser().resolve()
    if not root.exists():
        root.mkdir(parents=True, exist_ok=True)
    if not root.is_dir():
        raise HTTPException(
            status_code=500,
            detail="CODE_WORKSPACE is not a directory",
        )
    return root


def _safe_path(relative_path: str) -> Path:
    """
    Resolve a user-provided path to an absolute path INSIDE the workspace.
    Raises HTTPException if the path escapes.
    """
    root = _workspace_root()

    # Normalize the input — reject dangerous patterns upfront
    cleaned = (relative_path or "").strip().lstrip("/").lstrip("\\")
    if not cleaned:
        return root

    # Reject suspicious patterns
    if ".." in cleaned.split("/") or ".." in cleaned.split("\\"):
        raise HTTPException(status_code=400, detail="Path traversal not allowed")
    if "\x00" in cleaned:
        raise HTTPException(status_code=400, detail="Invalid path characters")
    if re.search(r"[<>:\"|?*]", cleaned.replace("/", "").replace("\\", "")):
        raise HTTPException(status_code=400, detail="Invalid path characters")

    # Build the absolute path
    target = (root / cleaned).resolve()

    # Verify it's inside root
    try:
        target.relative_to(root)
    except ValueError:
        raise HTTPException(
            status_code=403,
            detail="Path is outside the workspace",
        )

    # Reject symlinks that point outside
    if target.exists() and target.is_symlink():
        real = target.resolve()
        try:
            real.relative_to(root)
        except ValueError:
            raise HTTPException(
                status_code=403,
                detail="Symlink points outside workspace",
            )

    return target


def list_tree(relative_path: str = "", max_depth: int = 4) -> dict:
    """
    Return a nested tree of the workspace (or a subfolder).
    """
    root = _workspace_root()
    start = _safe_path(relative_path)
    if not start.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not start.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    counter = {"count": 0}

    def walk(path: Path, depth: int) -> list[dict]:
        if depth > max_depth or counter["count"] >= MAX_TREE_ENTRIES:
            return []

        entries = []
        try:
            items = sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
        except PermissionError:
            return []

        for item in items:
            if counter["count"] >= MAX_TREE_ENTRIES:
                break

            if item.is_dir():
                if item.name in SKIP_FOLDERS or item.name.startswith("."):
                    continue
                counter["count"] += 1
                entries.append({
                    "name": item.name,
                    "type": "directory",
                    "path": str(item.relative_to(root)).replace("\\", "/"),
                    "children": walk(item, depth + 1),
                })
            elif item.is_file():
                # Only include text files in tree (hide binaries)
                if item.suffix.lower() not in TEXT_EXTENSIONS:
                    continue
                counter["count"] += 1
                try:
                    size = item.stat().st_size
                except OSError:
                    size = 0
                entries.append({
                    "name": item.name,
                    "type": "file",
                    "path": str(item.relative_to(root)).replace("\\", "/"),
                    "size": size,
                    "extension": item.suffix.lower(),
                })

        return entries

    return {
        "root": str(root),
        "path": str(start.relative_to(root)).replace("\\", "/") or "",
        "entries": walk(start, 0),
        "total": counter["count"],
        "max_reached": counter["count"] >= MAX_TREE_ENTRIES,
    }


def read_file(relative_path: str) -> dict:
    """Read a text file from the workspace."""
    target = _safe_path(relative_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if not target.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")
    if target.suffix.lower() not in TEXT_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{target.suffix}' not supported for reading",
        )

    size = target.stat().st_size
    max_size = settings.CODE_MAX_FILE_SIZE
    if size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size} bytes, max {max_size})",
        )

    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read file: {e}")

    return {
        "path": str(target.relative_to(_workspace_root())).replace("\\", "/"),
        "name": target.name,
        "size": size,
        "lines": content.count("\n") + 1,
        "content": content,
        "modified_at": datetime.fromtimestamp(target.stat().st_mtime).isoformat(),
    }


def write_file(relative_path: str, content: str, create_dirs: bool = True) -> dict:
    """Write or overwrite a text file."""
    # Enforce size limit on the incoming content
    encoded = content.encode("utf-8")
    if len(encoded) > settings.CODE_MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Content too large ({len(encoded)} bytes, max {settings.CODE_MAX_FILE_SIZE})",
        )

    target = _safe_path(relative_path)
    if target.exists() and target.is_dir():
        raise HTTPException(status_code=400, detail="Path is a directory")
    if target.suffix.lower() not in TEXT_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"File type '{target.suffix}' not allowed",
        )

    if create_dirs:
        target.parent.mkdir(parents=True, exist_ok=True)

    existed = target.exists()
    try:
        target.write_text(content, encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not write file: {e}")

    return {
        "path": str(target.relative_to(_workspace_root())).replace("\\", "/"),
        "name": target.name,
        "size": len(encoded),
        "created": not existed,
        "overwritten": existed,
        "modified_at": datetime.fromtimestamp(target.stat().st_mtime).isoformat(),
    }


def delete_file(relative_path: str) -> dict:
    """Delete a file from the workspace."""
    target = _safe_path(relative_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if target.is_dir():
        raise HTTPException(
            status_code=400,
            detail="Directory deletion not supported — delete files individually",
        )

    try:
        target.unlink()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not delete file: {e}")

    return {"path": relative_path, "deleted": True}