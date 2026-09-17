from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_permission
from app.schemas.code import (
    ReadFileResponse,
    WriteFileRequest,
    WriteFileResponse,
    DeleteFileResponse,
    WorkspaceInfo,
    DiffPreviewRequest,
    DiffPreviewResponse,
    SyntaxCheckRequest,
    SyntaxCheckResponse,
    GitCommitRequest,
    CodeAssistantRequest,
    RunCodeRequest,
    RunCodeResponse,
)
from app.services.code_agent import (
    list_tree,
    read_file,
    write_file,
    delete_file,
    diff_preview,
    syntax_check,
    git_status,
    git_init,
    git_log,
    git_commit,
    run_python,
)
from app.services.code_assistant import apply_instruction
from app.services.audit import log_quick
from app.services.code_agent import (
    list_tree,
    read_file,
    write_file,
    delete_file,
    diff_preview,
    syntax_check,
    git_status,
    git_init,
    git_log,
    git_commit,
)
from app.schemas.code import (
    # ...existing...
    RunCodeRequest,
    RunCodeResponse,
)
from app.services.code_agent import (
    # ...existing...
    run_python,
)
from app.services.code_assistant import apply_instruction
from app.deps import get_current_user
from app.models.user import User
from app.schemas.code import (
    ReadFileResponse,
    WriteFileRequest,
    WriteFileResponse,
    DeleteFileResponse,
    WorkspaceInfo,
)
from app.services.code_agent import (
    list_tree,
    read_file,
    write_file,
    delete_file,
)

router = APIRouter(prefix="/code", tags=["code"])


@router.get("/tree", response_model=WorkspaceInfo)
def get_tree(
    path: str = Query(default="", max_length=500),
    depth: int = Query(default=4, ge=1, le=8),
    current_user: User = Depends(get_current_user),
):
    """List workspace as a tree."""
    return list_tree(path, depth)


@router.get("/read", response_model=ReadFileResponse)
def get_file(
    path: str = Query(min_length=1, max_length=500),
    current_user: User = Depends(get_current_user),
):
    """Read a file from the workspace."""
    return read_file(path)


@router.post("/write", response_model=WriteFileResponse)
def post_write(
    payload: WriteFileRequest,
    current_user: User = Depends(get_current_user),
):
    """Write or overwrite a file."""
    return write_file(payload.path, payload.content, payload.create_dirs)


@router.delete("/file", response_model=DeleteFileResponse)
def delete(
    path: str = Query(min_length=1, max_length=500),
    current_user: User = Depends(get_current_user),
):
    """Delete a file (not a directory)."""
    return delete_file(path)

@router.post("/diff", response_model=DiffPreviewResponse)
def post_diff(
    payload: DiffPreviewRequest,
    current_user: User = Depends(get_current_user),
):
    """Show what would change if we wrote this content."""
    return diff_preview(payload.path, payload.content)


@router.post("/syntax-check", response_model=SyntaxCheckResponse)
def post_syntax_check(
    payload: SyntaxCheckRequest,
    current_user: User = Depends(get_current_user),
):
    """Check syntax without writing."""
    return syntax_check(payload.path, payload.content)


@router.get("/git/status")
def get_git_status(current_user: User = Depends(get_current_user)):
    """Get git status of the workspace."""
    return git_status()


@router.post("/git/init")
def post_git_init(current_user: User = Depends(get_current_user)):
    """Initialize git repo if not already."""
    return git_init()


@router.get("/git/log")
def get_git_log(
    limit: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """Get recent commits."""
    return git_log(limit)


@router.post("/git/commit")
def post_git_commit(
    payload: GitCommitRequest,
    current_user: User = Depends(get_current_user),
):
    """Commit all staged changes."""
    return git_commit(payload.message)


@router.post("/assist")
def post_assist(
    payload: CodeAssistantRequest,
    current_user: User = Depends(get_current_user),
):
    """AI applies an instruction to a file — returns new content (does NOT write)."""
    return apply_instruction(payload.path, payload.instruction)
@router.post("/run", response_model=RunCodeResponse)
def post_run(
    payload: RunCodeRequest,
    current_user: User = Depends(require_permission("code.run")),
    db: Session = Depends(get_db),
):
    """Run a Python file inside the workspace (sandboxed, timeout-limited)."""
    result = run_python(payload.path, payload.args, payload.command)

    log_quick(
        db, current_user.id,
        action="code.run",
        summary=f"Ran {payload.path}",
        payload={"path": payload.path, "command": payload.command},
        result={
            "exit_code": result.get("exit_code"),
            "success": result.get("success"),
        },
        status="success" if result.get("success") else "failed",
    )
    return result