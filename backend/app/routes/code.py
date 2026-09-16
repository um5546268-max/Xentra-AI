from fastapi import APIRouter, Depends, Query

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