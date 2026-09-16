"""
Code agent service — safe file operations inside a whitelisted workspace.
Every path is resolved and checked against the workspace root.
"""
import os
import re
import difflib
import ast
import subprocess
import sys
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
def diff_preview(relative_path: str, new_content: str) -> dict:
    """
    Show a unified diff between the current file and proposed new content.
    Does NOT write anything.
    """
    target = _safe_path(relative_path)
    old_content = ""
    if target.exists() and target.is_file():
        try:
            old_content = target.read_text(encoding="utf-8", errors="replace")
        except Exception:
            old_content = ""

    old_lines = old_content.splitlines(keepends=True)
    new_lines = new_content.splitlines(keepends=True)

    diff = list(difflib.unified_diff(
        old_lines,
        new_lines,
        fromfile=f"a/{relative_path}",
        tofile=f"b/{relative_path}",
        lineterm="",
    ))

    additions = sum(1 for line in diff if line.startswith("+") and not line.startswith("+++"))
    deletions = sum(1 for line in diff if line.startswith("-") and not line.startswith("---"))

    return {
        "path": relative_path,
        "exists": target.exists(),
        "additions": additions,
        "deletions": deletions,
        "lines_changed": additions + deletions,
        "diff": "".join(diff),
        "old_size": len(old_content),
        "new_size": len(new_content),
    }


def syntax_check(relative_path: str, content: str) -> dict:
    """
    Check syntax for supported languages.
    Returns {"ok": bool, "error": str | None, "language": str}.
    """
    target = _safe_path(relative_path)
    ext = target.suffix.lower()

    if ext == ".py":
        try:
            ast.parse(content)
            return {"ok": True, "error": None, "language": "python"}
        except SyntaxError as e:
            return {
                "ok": False,
                "error": f"Line {e.lineno}: {e.msg}",
                "language": "python",
            }

    if ext in (".json",):
        import json as json_lib
        try:
            json_lib.loads(content)
            return {"ok": True, "error": None, "language": "json"}
        except Exception as e:
            return {"ok": False, "error": str(e), "language": "json"}

    # No syntax validation for other languages
    return {"ok": True, "error": None, "language": ext.lstrip(".") or "unknown"}


# ============================================================
# Git operations
# ============================================================

def _run_git(args: list[str], timeout: int = 15) -> tuple[int, str, str]:
    """Run a git command inside the workspace. Returns (returncode, stdout, stderr)."""
    root = _workspace_root()

    try:
        result = subprocess.run(
            ["git", *args],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Git command timed out"
    except FileNotFoundError:
        return -2, "", "Git is not installed or not in PATH"
    except Exception as e:
        return -3, "", str(e)


def git_status() -> dict:
    """Get git status of the workspace."""
    root = _workspace_root()
    is_repo = (root / ".git").exists()

    if not is_repo:
        return {
            "is_repo": False,
            "initialized": False,
            "branch": None,
            "files": [],
        }

    code, stdout, stderr = _run_git(["status", "--porcelain=v1", "--branch"])
    if code != 0:
        return {
            "is_repo": True,
            "error": stderr[:200],
            "branch": None,
            "files": [],
        }

    branch = None
    files = []
    for line in stdout.splitlines():
        if line.startswith("##"):
            branch = line.replace("##", "").strip()
            continue
        if len(line) >= 3:
            status = line[:2].strip()
            path = line[3:].strip()
            files.append({"status": status, "path": path})

    return {
        "is_repo": True,
        "initialized": True,
        "branch": branch,
        "files": files,
        "clean": len(files) == 0,
    }


def git_init() -> dict:
    """Initialize a git repo in the workspace if not already done."""
    root = _workspace_root()
    if (root / ".git").exists():
        return {"initialized": False, "already": True}

    code, _, stderr = _run_git(["init"])
    if code != 0:
        raise HTTPException(status_code=500, detail=f"git init failed: {stderr[:200]}")

    # Set a default author for commits
    _run_git(["config", "user.email", "xentra@local"])
    _run_git(["config", "user.name", "Xentra AI"])

    # Create a default .gitignore
    gitignore = root / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text(
            "__pycache__/\n*.pyc\n.venv/\nvenv/\nnode_modules/\n.next/\n.env\n",
            encoding="utf-8",
        )

    return {"initialized": True, "already": False}


def git_log(limit: int = 10) -> dict:
    """Get recent commit history."""
    root = _workspace_root()
    if not (root / ".git").exists():
        raise HTTPException(status_code=400, detail="Not a git repository")

    code, stdout, stderr = _run_git([
        "log",
        f"-{limit}",
        "--pretty=format:%H|%an|%ad|%s",
        "--date=iso",
    ])
    if code != 0:
        # No commits yet
        return {"commits": [], "empty": True}

    commits = []
    for line in stdout.splitlines():
        parts = line.split("|", 3)
        if len(parts) == 4:
            commits.append({
                "hash": parts[0],
                "hash_short": parts[0][:7],
                "author": parts[1],
                "date": parts[2],
                "message": parts[3],
            })
    return {"commits": commits, "empty": len(commits) == 0}


def git_commit(message: str) -> dict:
    """Stage all changes and create a commit."""
    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Commit message required")

    root = _workspace_root()
    if not (root / ".git").exists():
        raise HTTPException(status_code=400, detail="Not a git repository")

    # Stage all
    code, _, stderr = _run_git(["add", "-A"])
    if code != 0:
        raise HTTPException(status_code=500, detail=f"git add failed: {stderr[:200]}")

    # Check if there's anything to commit
    code, stdout, _ = _run_git(["status", "--porcelain"])
    if not stdout.strip():
        return {"committed": False, "reason": "Nothing to commit"}

    # Commit
    code, _, stderr = _run_git(["commit", "-m", message])
    if code != 0:
        raise HTTPException(status_code=500, detail=f"git commit failed: {stderr[:200]}")

    # Get the commit hash
    code, stdout, _ = _run_git(["rev-parse", "HEAD"])
    commit_hash = stdout.strip() if code == 0 else None

    return {
        "committed": True,
        "hash": commit_hash,
        "hash_short": commit_hash[:7] if commit_hash else None,
        "message": message,
    }
# ============================================================
# Safe test runner
# ============================================================

# Only these commands are allowed to execute
ALLOWED_COMMANDS = {
    "python": ["python"],
    "python3": ["python"],
    "pytest": ["python", "-m", "pytest"],
    "unittest": ["python", "-m", "unittest"],
}


def run_python(
    relative_path: str,
    args: list[str] | None = None,
    command: str = "python",
) -> dict:
    """
    Run a Python file inside the workspace.
    Strict limits: whitelisted command, whitelisted file, timeout, workspace-only cwd.
    """
    # Validate command
    if command not in ALLOWED_COMMANDS:
        raise HTTPException(
            status_code=400,
            detail=f"Command '{command}' not allowed. Allowed: {list(ALLOWED_COMMANDS.keys())}",
        )

    # Validate the path
    target = _safe_path(relative_path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if not target.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")
    if target.suffix.lower() != ".py":
        raise HTTPException(
            status_code=400,
            detail="Only .py files can be executed",
        )

    # Validate args — reject anything suspicious
    safe_args = []
    if args:
        if len(args) > 10:
            raise HTTPException(status_code=400, detail="Too many arguments")
        for a in args:
            if any(c in a for c in [";", "&", "|", "`", "$", "<", ">", "\n"]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsafe character in arg: {a[:30]}",
                )
            if len(a) > 200:
                raise HTTPException(status_code=400, detail="Arg too long")
            safe_args.append(a)

    # Build the command
    root = _workspace_root()
    if command == "python":
        cmd = ["python", str(target)] + safe_args
    elif command == "pytest":
        cmd = ["python", "-m", "pytest", str(target)] + safe_args
    elif command == "unittest":
        cmd = ["python", "-m", "unittest", str(target)] + safe_args
    else:
        cmd = ALLOWED_COMMANDS[command] + [str(target)] + safe_args

    timeout = settings.CODE_COMMAND_TIMEOUT

    try:
        result = subprocess.run(
            cmd,
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )
        return {
            "command": " ".join(cmd),
            "exit_code": result.returncode,
            "stdout": (result.stdout or "")[:10000],
            "stderr": (result.stderr or "")[:5000],
            "success": result.returncode == 0,
            "timed_out": False,
            "duration_ms": None,
        }
    except subprocess.TimeoutExpired as e:
        return {
            "command": " ".join(cmd),
            "exit_code": -1,
            "stdout": (e.stdout or b"").decode("utf-8", errors="replace")[:5000] if isinstance(e.stdout, bytes) else (e.stdout or "")[:5000],
            "stderr": f"Timed out after {timeout} seconds",
            "success": False,
            "timed_out": True,
        }
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Python is not available on the server",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {e}")