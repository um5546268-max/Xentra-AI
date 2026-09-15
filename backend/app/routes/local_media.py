from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user
from app.models.user import User
from app.services.local_media import list_roots, scan_root

router = APIRouter(prefix="/media", tags=["media"])


@router.get("/roots")
def get_roots(current_user: User = Depends(get_current_user)):
    """List whitelisted media folders."""
    return {"roots": list_roots()}


@router.get("/scan")
def scan(
    root_index: int = Query(ge=0),
    kind: str | None = Query(default=None, pattern="^(audio|video)$"),
    max_files: int = Query(default=200, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
):
    """Scan a whitelisted root folder for media files."""
    return scan_root(root_index, kind, max_files)