import os
import shutil
import subprocess
import tempfile
import difflib
import mimetypes
import time
from pathlib import Path
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_permission
from app.models.user import User
from app.services.usage_guard import enforce_limit


router = APIRouter(prefix="/code", tags=["code"])


# ═══════════════════════════════════════════════════════════════
# LANGUAGE CONFIG
# ═══════════════════════════════════════════════════════════════
LANGUAGE_CONFIG: dict[str, dict] = {
    ".py":  {"lang": "python",     "run": ["python"]},
    ".js":  {"lang": "javascript", "run": ["node"]},
    ".mjs": {"lang": "javascript", "run": ["node"]},
    ".ts":  {"lang": "typescript", "run": ["npx", "ts-node"]},
    ".rb":  {"lang": "ruby",       "run": ["ruby"]},
    ".php": {"lang": "php",        "run": ["php"]},
    ".sh":  {"lang": "bash",       "run": ["bash"]},
    ".go":  {"lang": "go",         "run": ["go", "run"]},
    ".c":   {"lang": "c",   "compile": ["gcc",  "{src}", "-o", "{out}"], "run": ["{out}"]},
    ".cpp": {"lang": "cpp", "compile": ["g++",  "{src}", "-o", "{out}"], "run": ["{out}"]},
    ".cc":  {"lang": "cpp", "compile": ["g++",  "{src}", "-o", "{out}"], "run": ["{out}"]},
    ".rs":  {"lang": "rust","compile": ["rustc","{src}", "-o", "{out}"], "run": ["{out}"]},
    ".java":{"lang": "java","compile": ["javac", "{src}"], "run": ["java", "-cp", "{dir}", "{name}"]},
}


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════
class RunRequest(BaseModel):
    path: str
    args: list[str] = []
    command: Optional[str] = None
    timeout: Optional[int] = 60


class SaveRequest(BaseModel):
    path: str
    content: str


class DiffRequest(BaseModel):
    path: str
    new_content: str


class AskRequest(BaseModel):
    path: str
    instruction: str


class CreateRequest(BaseModel):
    path: str
    kind: str = "file"      # "file" | "folder"
    content: str = ""


class RenameRequest(BaseModel):
    old_path: str
    new_path: str


class GitCommitRequest(BaseModel):
    message: str


class MoveRequest(BaseModel):
    src: str
    dest_dir: str
    new_name: str | None = None


class DebugRequest(BaseModel):
    path: str
    args: list[str] = []
    timeout: Optional[int] = 120


class TestRequest(BaseModel):
    path: Optional[str] = None
    timeout: Optional[int] = 180


# ═══════════════════════════════════════════════════════════════
# HELPERS — PER-USER ISOLATION
# ═══════════════════════════════════════════════════════════════
def _workspace_root(user: User) -> Path:
    """
    Each user gets their OWN sandboxed workspace.
    Path: ./workspaces/{user.id}/
    Files never leak between accounts.
    """
    base = Path(
        getattr(settings, "CODE_WORKSPACE", "") or "./workspaces"
    ).expanduser().resolve()
    root = base / str(user.id)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _safe_join(root: Path, relative: str) -> Path:
    """Prevent path traversal — path must stay inside root."""
    target = (root / relative).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        raise HTTPException(400, "Path outside workspace")
    return target


def _build_tree(root: Path, dir_path: Path) -> list[dict]:
    entries: list[dict] = []
    try:
        for item in sorted(
            dir_path.iterdir(), key=lambda p: (p.is_file(), p.name.lower())
        ):
            if item.name in {".git", "__pycache__", "node_modules", ".venv", "venv"}:
                continue
            rel = str(item.relative_to(root)).replace("\\", "/")
            if item.is_dir():
                entries.append({
                    "name": item.name,
                    "path": rel,
                    "type": "directory",
                    "children": _build_tree(root, item),
                })
            else:
                entries.append({
                    "name": item.name,
                    "path": rel,
                    "type": "file",
                })
    except PermissionError:
        pass
    return entries


def _detect_language(path: str) -> Optional[dict]:
    return LANGUAGE_CONFIG.get(Path(path).suffix.lower())


def _run_git(args: list[str], cwd: Path) -> tuple[int, str, str]:
    try:
        r = subprocess.run(
            ["git"] + args, capture_output=True, text=True, cwd=str(cwd), timeout=30
        )
        return r.returncode, r.stdout, r.stderr
    except FileNotFoundError:
        return 1, "", "git is not installed"
    except subprocess.TimeoutExpired:
        return 1, "", "git command timed out"


def _is_git_repo(root: Path) -> bool:
    code, _, _ = _run_git(["rev-parse", "--is-inside-work-tree"], root)
    return code == 0


# ═══════════════════════════════════════════════════════════════
# TREE
# ═══════════════════════════════════════════════════════════════
@router.get("/tree")
def get_tree(
    path: str = "",
    current_user: User = Depends(get_current_user),
):
    root = _workspace_root(current_user)
    start = _safe_join(root, path) if path else root
    if not start.exists():
        raise HTTPException(404, "Path not found")
    return {"root": str(root), "entries": _build_tree(root, start)}


# ═══════════════════════════════════════════════════════════════
# READ / WRITE
# ═══════════════════════════════════════════════════════════════
@router.get("/read")
def read_file(
    path: str,
    current_user: User = Depends(get_current_user),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")
    try:
        return {
            "path": path,
            "content": target.read_text(encoding="utf-8", errors="replace"),
        }
    except Exception as e:
        raise HTTPException(500, f"Read failed: {e}")


@router.post("/write")
def write_file(
    payload: SaveRequest,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.write")),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, payload.path)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        target.write_text(payload.content, encoding="utf-8")
    except Exception as e:
        raise HTTPException(500, f"Write failed: {e}")
    return {"ok": True, "path": payload.path}


# ═══════════════════════════════════════════════════════════════
# CREATE / RENAME / DELETE
# ═══════════════════════════════════════════════════════════════
@router.post("/create")
def create_entry(
    payload: CreateRequest,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.write")),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, payload.path)
    if target.exists():
        raise HTTPException(409, "Already exists")
    target.parent.mkdir(parents=True, exist_ok=True)
    if payload.kind == "folder":
        target.mkdir()
    else:
        target.write_text(payload.content, encoding="utf-8")
    return {
        "ok": True,
        "path": str(target.relative_to(root)).replace("\\", "/"),
        "kind": payload.kind,
    }


@router.post("/rename")
def rename_entry(
    payload: RenameRequest,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.write")),
):
    root = _workspace_root(current_user)
    src = _safe_join(root, payload.old_path)
    dst = _safe_join(root, payload.new_path)
    if not src.exists():
        raise HTTPException(404, "Source not found")
    if dst.exists():
        raise HTTPException(409, "Destination already exists")
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    return {
        "ok": True,
        "old_path": payload.old_path,
        "new_path": payload.new_path,
    }


@router.delete("/entry")
def delete_entry(
    path: str,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.write")),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, path)
    if not target.exists():
        raise HTTPException(404, "Not found")
    try:
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
    except Exception as e:
        raise HTTPException(500, f"Delete failed: {e}")
    return {"ok": True, "path": path}


# ═══════════════════════════════════════════════════════════════
# UPLOAD
# ═══════════════════════════════════════════════════════════════
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    dest_path: str = Form(""),
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.write")),
):
    root = _workspace_root(current_user)
    dest_dir = _safe_join(root, dest_path) if dest_path else root
    dest_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(file.filename or "upload.bin").name
    target = dest_dir / safe_name
    if target.exists():
        stem = target.stem
        suffix = target.suffix
        i = 1
        while target.exists():
            target = dest_dir / f"{stem}_{i}{suffix}"
            i += 1

    with target.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            out.write(chunk)

    return {
        "ok": True,
        "path": str(target.relative_to(root)).replace("\\", "/"),
        "name": target.name,
        "size": target.stat().st_size,
    }


@router.post("/mkdir")
def make_folder(
    path: str,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.write")),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, path)
    if target.exists():
        raise HTTPException(409, "Already exists")
    target.mkdir(parents=True, exist_ok=True)
    return {
        "ok": True,
        "path": str(target.relative_to(root)).replace("\\", "/"),
    }


# ═══════════════════════════════════════════════════════════════
# RUN
# ═══════════════════════════════════════════════════════════════
@router.post("/run")
def run_file(
    payload: RunRequest,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.run")),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, payload.path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")

    config = _detect_language(payload.path)
    if not config:
        raise HTTPException(400, f"Unsupported file type: {target.suffix}")

    args = payload.args or []
    timeout = min(payload.timeout or 60, 300)
    tmp_dir: Optional[Path] = None

    try:
        if "compile" in config:
            tmp_dir = Path(tempfile.mkdtemp(prefix="xentra_run_"))
            ext = ".exe" if os.name == "nt" else ""
            out_bin = tmp_dir / f"{target.stem}{ext}"

            compile_cmd = [
                p.replace("{src}", str(target))
                 .replace("{out}", str(out_bin))
                 .replace("{dir}", str(target.parent))
                 .replace("{name}", target.stem)
                for p in config["compile"]
            ]
            try:
                c = subprocess.run(
                    compile_cmd, capture_output=True, text=True,
                    timeout=60, cwd=str(target.parent),
                )
            except FileNotFoundError:
                return _missing_tool(config["lang"], compile_cmd[0])
            if c.returncode != 0:
                return {
                    "success": False,
                    "exit_code": c.returncode,
                    "stdout": c.stdout,
                    "stderr": c.stderr or f"Compilation failed ({compile_cmd[0]})",
                    "command": " ".join(compile_cmd),
                    "language": config["lang"],
                }

            run_cmd = [
                p.replace("{out}", str(out_bin))
                 .replace("{dir}", str(target.parent))
                 .replace("{name}", target.stem)
                for p in config["run"]
            ]
        else:
            run_cmd = list(config["run"]) + [str(target)]

        full_cmd = run_cmd + args

        try:
            result = subprocess.run(
                full_cmd, capture_output=True, text=True,
                timeout=timeout, cwd=str(target.parent),
                stdin=subprocess.DEVNULL,
            )
        except FileNotFoundError:
            return _missing_tool(config["lang"], full_cmd[0])

        stderr = result.stderr or ""
        hint = None
        if "EOFError" in stderr or "input(" in stderr:
            hint = "This script tried to read stdin. Pass values as arguments instead."

        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "command": " ".join(full_cmd),
            "language": config["lang"],
            "interactive_hint": hint,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Execution timed out after {timeout}s",
            "command": " ".join(config.get("run", [])),
            "language": config["lang"],
            "timed_out": True,
        }
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


def _missing_tool(lang: str, tool: str) -> dict:
    return {
        "success": False,
        "exit_code": -1,
        "stdout": "",
        "stderr": f"{tool} is not installed. Install it to run {lang} code.",
        "command": tool,
        "language": lang,
    }


# ═══════════════════════════════════════════════════════════════
# SYNTAX CHECK
# ═══════════════════════════════════════════════════════════════
@router.post("/syntax-check")
def check_syntax(
    payload: SaveRequest,
    current_user: User = Depends(get_current_user),
):
    ext = Path(payload.path).suffix.lower()

    if ext == ".py":
        try:
            compile(payload.content, payload.path, "exec")
            return {"ok": True}
        except SyntaxError as e:
            return {"ok": False, "error": f"{e.msg} (line {e.lineno})"}

    if ext == ".json":
        import json as _json
        try:
            _json.loads(payload.content)
            return {"ok": True}
        except _json.JSONDecodeError as e:
            return {"ok": False, "error": f"{e.msg} (line {e.lineno})"}

    if ext in (".js", ".mjs"):
        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=ext, delete=False, encoding="utf-8"
        )
        try:
            tmp.write(payload.content)
            tmp.close()
            r = subprocess.run(
                ["node", "--check", tmp.name],
                capture_output=True, text=True, timeout=10,
            )
            return {
                "ok": r.returncode == 0,
                "error": r.stderr.strip() if r.returncode else None,
            }
        except FileNotFoundError:
            return {"ok": True, "note": "node not installed"}
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass

    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
# DIFF
# ═══════════════════════════════════════════════════════════════
@router.post("/diff")
def preview_diff(
    payload: DiffRequest,
    current_user: User = Depends(get_current_user),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, payload.path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")

    old = target.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)
    new = payload.new_content.splitlines(keepends=True)
    diff = difflib.unified_diff(
        old, new,
        fromfile=f"a/{payload.path}",
        tofile=f"b/{payload.path}",
        lineterm="",
    )
    return {"diff": "".join(diff)}


# ═══════════════════════════════════════════════════════════════
# AI ASSIST
# ═══════════════════════════════════════════════════════════════
@router.post("/assist")
def ask_assistant(
    payload: AskRequest,
    current_user: User = Depends(get_current_user),
    _limit: None = Depends(enforce_limit("ai_coding")),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, payload.path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")

    current = target.read_text(encoding="utf-8", errors="replace")

    try:
        from app.services.ai import chat_completion
        prompt = (
            "You are a code editor. Modify the following file according to the "
            "user's instruction.\n"
            "Return ONLY the new file content — no markdown fences, no explanations.\n\n"
            f"File: {payload.path}\n"
            f"Current content:\n{current}\n\n"
            f"Instruction: {payload.instruction}\n\n"
            "New content:"
        )
        result = chat_completion(messages=[{"role": "user", "content": prompt}])
        new_content = result["content"].strip()
        if new_content.startswith("```"):
            lines = new_content.split("\n")
            if lines[-1].strip().startswith("```"):
                new_content = "\n".join(lines[1:-1])
            else:
                new_content = "\n".join(lines[1:])
        return {"new_content": new_content, "model": result.get("model", "unknown")}
    except Exception as e:
        raise HTTPException(500, f"AI failed: {e}")


# ═══════════════════════════════════════════════════════════════
# PREVIEW — short-lived tokens for iframe access
# ═══════════════════════════════════════════════════════════════
@router.get("/preview-token")
def get_preview_token(current_user: User = Depends(get_current_user)):
    import jwt
    payload = {
        "sub": str(current_user.id),
        "purpose": "preview",
        "exp": int(time.time()) + 3600,
    }
    token = jwt.encode(
        payload,
        getattr(settings, "JWT_SECRET", "dev-secret-change-in-prod"),
        algorithm="HS256",
    )
    return {"token": token, "expires_in": 3600}


@router.get("/preview/{file_path:path}")
def preview_file(
    file_path: str,
    token: str = "",
    db: Session = Depends(get_db),
):
    import jwt
    if not token:
        raise HTTPException(401, "Missing preview token")
    try:
        payload = jwt.decode(
            token,
            getattr(settings, "JWT_SECRET", "dev-secret-change-in-prod"),
            algorithms=["HS256"],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Preview token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid preview token")

    if payload.get("purpose") != "preview":
        raise HTTPException(401, "Invalid token purpose")

    # ✅ Fetch the actual user from the JWT sub
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(401, "Invalid token payload")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, "User not found")

    root = _workspace_root(user)
    target = _safe_join(root, file_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")

    media_type, _ = mimetypes.guess_type(str(target))
    media_type = media_type or "application/octet-stream"
    return FileResponse(str(target), media_type=media_type)


# ═══════════════════════════════════════════════════════════════
# GIT
# ═══════════════════════════════════════════════════════════════
@router.get("/git/status")
def git_status(current_user: User = Depends(get_current_user)):
    root = _workspace_root(current_user)
    if not _is_git_repo(root):
        return {
            "is_repo": False, "branch": None, "files": [],
            "clean": True, "ahead": 0, "behind": 0,
        }

    _, branch_out, _ = _run_git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    branch = branch_out.strip() or "main"

    _, status_out, _ = _run_git(["status", "--porcelain"], root)
    files = []
    for line in status_out.splitlines():
        if len(line) < 4:
            continue
        files.append({"path": line[3:].strip(), "status": line[:2].strip() or "?"})

    return {
        "is_repo": True,
        "branch": branch,
        "files": files,
        "clean": len(files) == 0,
        "ahead": 0,
        "behind": 0,
    }


@router.post("/git/init")
def git_init(current_user: User = Depends(get_current_user)):
    root = _workspace_root(current_user)
    if _is_git_repo(root):
        return {"ok": True, "already": True}
    code, _, err = _run_git(["init"], root)
    if code != 0:
        raise HTTPException(500, f"git init failed: {err}")
    _run_git(["checkout", "-b", "main"], root)
    gi = root / ".gitignore"
    if not gi.exists():
        gi.write_text(
            "__pycache__/\nnode_modules/\n.venv/\nvenv/\n*.pyc\n*.exe\n*.o\n.DS_Store\n",
            encoding="utf-8",
        )
    return {"ok": True, "already": False}


@router.post("/git/commit")
def git_commit(
    payload: GitCommitRequest,
    current_user: User = Depends(get_current_user),
):
    root = _workspace_root(current_user)
    if not _is_git_repo(root):
        raise HTTPException(400, "Not a git repository")

    code, _, err = _run_git(["add", "-A"], root)
    if code != 0:
        raise HTTPException(500, f"git add failed: {err}")

    code, _, _ = _run_git(["diff", "--cached", "--quiet"], root)
    if code == 0:
        return {"committed": False, "reason": "No changes to commit"}

    code, _, err = _run_git(
        [
            "-c", "user.email=xentra@local",
            "-c", "user.name=Xentra",
            "commit", "-m", payload.message,
        ],
        root,
    )
    if code != 0:
        raise HTTPException(500, f"git commit failed: {err}")

    _, hash_out, _ = _run_git(["rev-parse", "--short", "HEAD"], root)
    return {"committed": True, "hash_short": hash_out.strip()}


@router.get("/git/log")
def git_log(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
):
    root = _workspace_root(current_user)
    if not _is_git_repo(root):
        return {"commits": []}
    code, out, _ = _run_git(
        [
            "log", f"-{min(limit, 100)}",
            "--pretty=format:%H%x09%h%x09%an%x09%ae%x09%at%x09%s",
        ],
        root,
    )
    if code != 0:
        return {"commits": []}
    commits = []
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 6:
            continue
        commits.append({
            "hash": parts[0],
            "short": parts[1],
            "author": parts[2],
            "email": parts[3],
            "timestamp": int(parts[4]) if parts[4].isdigit() else 0,
            "subject": parts[5],
        })
    return {"commits": commits}


# ═══════════════════════════════════════════════════════════════
# MOVE
# ═══════════════════════════════════════════════════════════════
@router.post("/move")
def move_entry(
    payload: MoveRequest,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.write")),
):
    root = _workspace_root(current_user)
    src = _safe_join(root, payload.src)
    dest_dir = _safe_join(root, payload.dest_dir) if payload.dest_dir else root

    if not src.exists():
        raise HTTPException(404, "Source not found")
    if not dest_dir.exists() or not dest_dir.is_dir():
        raise HTTPException(400, "Destination folder not found")

    name = payload.new_name or src.name
    dst = dest_dir / name

    if src.is_dir() and (dst == src or src in dst.parents):
        raise HTTPException(400, "Cannot move a folder into itself")

    if dst.exists() and dst != src:
        raise HTTPException(409, "A file with that name already exists there")

    try:
        src.rename(dst)
    except Exception as e:
        raise HTTPException(500, f"Move failed: {e}")

    return {
        "ok": True,
        "src": payload.src,
        "new_path": str(dst.relative_to(root)).replace("\\", "/"),
    }


# ═══════════════════════════════════════════════════════════════
# DEBUG
# ═══════════════════════════════════════════════════════════════
@router.post("/debug")
def debug_file(
    payload: DebugRequest,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.run")),
):
    root = _workspace_root(current_user)
    target = _safe_join(root, payload.path)
    if not target.exists() or not target.is_file():
        raise HTTPException(404, "File not found")

    ext = target.suffix.lower()
    args = payload.args or []
    timeout = min(payload.timeout or 120, 300)

    if ext == ".py":
        cmd = ["python", "-m", "pdb", str(target)] + args
    elif ext in (".js", ".mjs"):
        cmd = ["node", "--inspect-brk", str(target)] + args
    elif ext == ".ts":
        cmd = ["npx", "ts-node", str(target)] + args
    else:
        config = _detect_language(payload.path)
        if not config:
            raise HTTPException(400, f"Debug not supported for {ext}")
        cmd = list(config["run"]) + [str(target)] + args

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=timeout, cwd=str(target.parent),
            stdin=subprocess.DEVNULL,
        )
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "command": " ".join(cmd),
            "language": ext.replace(".", ""),
            "mode": "debug",
            "hint": (
                "Python: send 'n' (next), 's' (step), 'c' (continue), 'p var' (print) as args. "
                "Node: open chrome://inspect in Chrome to attach the debugger."
                if ext in (".py", ".js", ".mjs")
                else None
            ),
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Debug session timed out after {timeout}s",
            "command": " ".join(cmd),
            "language": ext.replace(".", ""),
            "mode": "debug",
            "timed_out": True,
        }
    except FileNotFoundError as e:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Debugger not available: {e}",
            "command": " ".join(cmd),
            "language": ext.replace(".", ""),
            "mode": "debug",
        }


# ═══════════════════════════════════════════════════════════════
# TEST
# ═══════════════════════════════════════════════════════════════
def _detect_test_command(
    root: Path, file_path: Optional[str]
) -> tuple[list[str], str]:
    if file_path:
        target = _safe_join(root, file_path)
        ext = target.suffix.lower()

        if ext == ".py":
            return (["python", "-m", "pytest", str(target), "-v"], "pytest")
        if ext in (".js", ".mjs", ".ts"):
            if (root / "package.json").exists():
                return (["npm", "test", "--", str(target)], "npm-test")
            return (["node", str(target)], "node")
        if ext == ".go":
            return (
                ["go", "test", "-v", f"./{target.parent.relative_to(root)}"],
                "go-test",
            )

    if (
        (root / "pyproject.toml").exists()
        or (root / "pytest.ini").exists()
        or (root / "setup.py").exists()
    ):
        return (["python", "-m", "pytest", "-v"], "pytest")

    if (root / "package.json").exists():
        pkg = (root / "package.json").read_text(
            encoding="utf-8", errors="replace"
        )
        if '"vitest"' in pkg:
            return (["npx", "vitest", "run"], "vitest")
        if '"jest"' in pkg:
            return (["npx", "jest"], "jest")
        return (["npm", "test"], "npm-test")

    if (root / "go.mod").exists():
        return (["go", "test", "-v", "./..."], "go-test")

    py_tests = list(root.glob("**/test_*.py"))
    if py_tests:
        return (["python", "-m", "pytest", "-v"], "pytest")

    return ([], "unknown")


@router.post("/test")
def run_tests(
    payload: TestRequest,
    current_user: User = Depends(get_current_user),
    _perm: None = Depends(require_permission("code.run")),
):
    root = _workspace_root(current_user)
    timeout = min(payload.timeout or 180, 600)

    cmd, framework = _detect_test_command(root, payload.path)

    if not cmd:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": (
                "No test framework detected. Add a `pyproject.toml`, "
                "`package.json`, or `go.mod`, or create a `test_*.py` file."
            ),
            "command": "",
            "language": "unknown",
            "mode": "test",
            "framework": "unknown",
        }

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True,
            timeout=timeout, cwd=str(root),
            stdin=subprocess.DEVNULL,
        )
        summary = _parse_test_summary(result.stdout + result.stderr, framework)
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "command": " ".join(cmd),
            "language": framework,
            "mode": "test",
            "framework": framework,
            "summary": summary,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Tests timed out after {timeout}s",
            "command": " ".join(cmd),
            "language": framework,
            "mode": "test",
            "framework": framework,
            "timed_out": True,
        }
    except FileNotFoundError as e:
        return {
            "success": False,
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Test runner not found: {e}",
            "command": " ".join(cmd),
            "language": framework,
            "mode": "test",
            "framework": framework,
        }


def _parse_test_summary(output: str, framework: str) -> dict:
    import re
    summary = {"passed": 0, "failed": 0, "skipped": 0, "total": 0}

    if framework == "pytest":
        m = re.search(r"(\d+) passed", output)
        if m: summary["passed"] = int(m.group(1))
        m = re.search(r"(\d+) failed", output)
        if m: summary["failed"] = int(m.group(1))
        m = re.search(r"(\d+) skipped", output)
        if m: summary["skipped"] = int(m.group(1))

    if framework in ("jest", "vitest", "npm-test"):
        m = re.search(r"(\d+) passed", output)
        if m: summary["passed"] = int(m.group(1))
        m = re.search(r"(\d+) failed", output)
        if m: summary["failed"] = int(m.group(1))
        m = re.search(r"(\d+) skipped", output)
        if m: summary["skipped"] = int(m.group(1))

    if framework == "go-test":
        passed = len(re.findall(r"^ok\s", output, re.MULTILINE))
        failed = len(re.findall(r"^FAIL\s", output, re.MULTILINE))
        summary["passed"] = passed
        summary["failed"] = failed

    summary["total"] = summary["passed"] + summary["failed"] + summary["skipped"]
    return summary