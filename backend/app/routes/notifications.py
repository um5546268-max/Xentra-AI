import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationRead,
    NotificationListResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(
    limit: int = Query(default=50, ge=1, le=200),
    only_unread: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the current user's notifications, newest first."""
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if only_unread:
        stmt = stmt.where(Notification.read == False)  # noqa: E712

    items = db.execute(stmt).scalars().all()

    unread = db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == current_user.id)
        .where(Notification.read == False)  # noqa: E712
    ).scalar_one()

    return NotificationListResponse(
        count=len(items),
        unread=unread,
        notifications=items,
    )


@router.post("/{notification_id}/read", response_model=NotificationRead)
def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.get(Notification, notification_id)
    if not n or n.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    db.commit()
    db.refresh(n)
    return n


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    updated = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,  # noqa: E712
    ).update({Notification.read: True}, synchronize_session=False)
    db.commit()
    return {"updated": updated}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    n = db.get(Notification, notification_id)
    if not n or n.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n)
    db.commit()
    return None


@router.delete("", status_code=204)
def clear_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all notifications for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return None