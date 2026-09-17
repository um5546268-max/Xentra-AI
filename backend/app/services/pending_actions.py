"""
Pending action service.
Create, list, approve, deny, and expire confirmation-required actions.
"""
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.pending_action import PendingAction
from app.models.notification import Notification
from app.services.notifications import create_notification
from app.services.permissions import get_permission, requires_confirmation as perm_requires_confirmation


DEFAULT_EXPIRY_MINUTES = 60


def create_pending_action(
    db: Session,
    user_id,
    action: str,
    summary: str,
    payload: dict | None = None,
    source: str = "user",
    source_id=None,
    expires_in_minutes: int = DEFAULT_EXPIRY_MINUTES,
) -> PendingAction:
    """
    Create a pending action that needs user approval.
    Also creates an in-app notification.
    """
    perm = get_permission(action) or {}
    scope = perm.get("scope")
    tier = perm.get("tier", "high")

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)

    pa = PendingAction(
        user_id=user_id,
        action=action,
        scope=scope,
        tier=tier,
        payload=payload,
        summary=summary,
        source=source,
        source_id=source_id,
        status="pending",
        expires_at=expires_at,
    )
    db.add(pa)
    db.commit()
    db.refresh(pa)

    # Create notification
    try:
        create_notification(
            db,
            user_id,
            title=f"⏳ Confirmation needed",
            body=summary,
            level="warning",
            source="pending_action",
            source_id=pa.id,
            link="/app/pending",
            meta={"pending_action_id": str(pa.id), "action": action},
        )
    except Exception as e:
        print(f"[pending_actions] Notification failed: {e}")

    return pa


def get_pending_action(db: Session, user_id, action_id):
    pa = db.get(PendingAction, action_id)
    if not pa or pa.user_id != user_id:
        return None
    return pa


def list_pending_actions(
    db: Session,
    user_id,
    status: str | None = None,
    limit: int = 50,
):
    stmt = (
        select(PendingAction)
        .where(PendingAction.user_id == user_id)
        .order_by(PendingAction.created_at.desc())
        .limit(limit)
    )
    if status:
        stmt = stmt.where(PendingAction.status == status)

    return db.execute(stmt).scalars().all()


def approve_action(db: Session, pa: PendingAction) -> PendingAction:
    """Mark a pending action as approved."""
    pa.status = "approved"
    pa.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pa)
    return pa


def deny_action(
    db: Session,
    pa: PendingAction,
    note: str | None = None,
) -> PendingAction:
    """Mark a pending action as denied."""
    pa.status = "denied"
    pa.resolved_at = datetime.now(timezone.utc)
    pa.resolution_note = note
    db.commit()
    db.refresh(pa)
    return pa


def expire_old_pending_actions(db: Session) -> int:
    """Mark expired pending actions. Returns count expired."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(PendingAction)
        .where(PendingAction.status == "pending")
        .where(PendingAction.expires_at <= now)
    )
    expired = db.execute(stmt).scalars().all()
    for pa in expired:
        pa.status = "expired"
        pa.resolved_at = now
    if expired:
        db.commit()
    return len(expired)


def user_has_pending_confirmation(db: Session, user_id, action: str) -> bool:
    """Check if there's already a pending action for this action type."""
    stmt = (
        select(PendingAction)
        .where(PendingAction.user_id == user_id)
        .where(PendingAction.action == action)
        .where(PendingAction.status == "pending")
    )
    return db.execute(stmt).scalar_one_or_none() is not None