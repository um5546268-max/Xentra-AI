import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.pending_action import (
    PendingActionRead,
    PendingActionListResponse,
    DenyActionRequest,
)
from app.services import pending_actions as pa_service
from app.services.audit import log_quick


router = APIRouter(prefix="/pending-actions", tags=["pending-actions"])


@router.get("", response_model=PendingActionListResponse)
def list_actions(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's pending actions."""
    # First expire any stale ones
    pa_service.expire_old_pending_actions(db)

    actions = pa_service.list_pending_actions(db, current_user.id, status=status)

    pending_count = pa_service.list_pending_actions(
        db, current_user.id, status="pending"
    )

    return PendingActionListResponse(
        count=len(actions),
        pending=len(pending_count),
        actions=actions,
    )


@router.get("/{action_id}", response_model=PendingActionRead)
def get_action(
    action_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pa = pa_service.get_pending_action(db, current_user.id, action_id)
    if not pa:
        raise HTTPException(status_code=404, detail="Pending action not found")
    return pa


@router.post("/{action_id}/approve", response_model=PendingActionRead)
def approve(
    action_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a pending action. Executes it immediately."""
    pa = pa_service.get_pending_action(db, current_user.id, action_id)
    if not pa:
        raise HTTPException(status_code=404, detail="Pending action not found")

    if pa.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Action is not pending (current status: {pa.status})",
        )

    # Mark approved
    pa = pa_service.approve_action(db, pa)

    # Execute the action based on its type
    try:
        result = _execute_approved_action(db, current_user, pa)
        pa.status = "executed"
        pa.result = result
    except Exception as e:
        pa.status = "failed"
        pa.error = str(e)[:500]
    db.commit()
    db.refresh(pa)

    log_quick(
        db, current_user.id,
        action="pending.approve",
        summary=f"Approved: {pa.summary}",
        payload={"action_id": str(pa.id), "target_action": pa.action},
    )

    return pa


@router.post("/{action_id}/deny", response_model=PendingActionRead)
def deny(
    action_id: uuid.UUID,
    payload: DenyActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deny a pending action."""
    pa = pa_service.get_pending_action(db, current_user.id, action_id)
    if not pa:
        raise HTTPException(status_code=404, detail="Pending action not found")

    if pa.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Action is not pending (current status: {pa.status})",
        )

    pa = pa_service.deny_action(db, pa, note=payload.note)

    log_quick(
        db, current_user.id,
        action="pending.deny",
        summary=f"Denied: {pa.summary}",
        payload={"action_id": str(pa.id), "target_action": pa.action},
    )

    return pa


# ============================================================
# Action executor — handles each pending action type
# ============================================================

def _execute_approved_action(db, user, pa) -> dict:
    """
    Execute the action that was just approved.
    Returns a result dict.
    """
    action = pa.action
    payload = pa.payload or {}

    # ===== Files =====
    if action == "files.delete":
        from app.models.file import UserFile
        from app.services.files import delete_file_on_disk
        from app.models.chunk import FileChunk

        file_id = payload.get("file_id")
        if not file_id:
            raise ValueError("Missing file_id in payload")

        f = db.get(UserFile, uuid.UUID(file_id))
        if not f or f.user_id != user.id:
            raise ValueError("File not found or not owned by user")

        db.query(FileChunk).filter(FileChunk.file_id == f.id).delete()
        delete_file_on_disk(str(user.id), f.stored_name)
        db.delete(f)
        db.commit()
        return {"deleted": True, "file_id": file_id}

    # ===== Browser =====
    if action == "browser.download":
        url = payload.get("url")
        return {"note": "download not yet wired", "url": url}

    # ===== Shopping =====
    if action == "shopping.purchase":
        product_url = payload.get("product_url")
        return {"note": "purchase not yet wired", "product_url": product_url}

    # ===== Email =====
    if action == "email.send":
        return {"note": "email send not yet wired"}

    # Unknown action — don't run
    raise ValueError(f"No executor for action: {action}")