"""
Emergency stop service.
Halts all running work for a user (or globally).
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.models.user import User
from app.models.task import Task
from app.models.automation import Automation
from app.models.pending_action import PendingAction
from app.services.audit import log_quick


def is_stopped(user: User) -> bool:
    """Check if a user has emergency stop active."""
    from app.config import settings
    if settings.GLOBAL_EMERGENCY_STOP:
        return True
    return bool(getattr(user, "emergency_stop", False))


def activate_emergency_stop(
    db: Session,
    user: User,
    reason: str | None = None,
) -> dict:
    """
    Activate emergency stop for a user. Cancels all running work.
    Returns a summary of what was stopped.
    """
    user.emergency_stop = True
    user.emergency_stop_reason = reason or "Activated by user"
    user.emergency_stop_at = datetime.now(timezone.utc)

    # 1. Cancel all running/queued tasks
    tasks_cancelled = db.query(Task).filter(
        Task.user_id == user.id,
        Task.status.in_(["queued", "running", "paused"]),
    ).update(
        {Task.status: "cancelled"},
        synchronize_session=False,
    )

    # 2. Disable all automations
    automations_disabled = db.query(Automation).filter(
        Automation.user_id == user.id,
        Automation.enabled == True,  # noqa: E712
    ).update(
        {Automation.enabled: False},
        synchronize_session=False,
    )

    # 3. Deny all pending actions
    pending_denied = db.query(PendingAction).filter(
        PendingAction.user_id == user.id,
        PendingAction.status == "pending",
    ).update(
        {
            PendingAction.status: "denied",
            PendingAction.resolved_at: datetime.now(timezone.utc),
            PendingAction.resolution_note: "Emergency stop",
        },
        synchronize_session=False,
    )

    db.commit()

    # 4. Create notification
    try:
        from app.services.notifications import create_notification
        create_notification(
            db,
            user.id,
            title="🛑 Emergency stop activated",
            body=(
                f"Cancelled {tasks_cancelled} tasks · "
                f"Disabled {automations_disabled} automations · "
                f"Denied {pending_denied} pending actions."
            ),
            level="error",
            source="system",
        )
    except Exception as e:
        print(f"[emergency] Notification failed: {e}")

    # 5. Audit log
    try:
        log_quick(
            db, user.id,
            action="system.emergency_stop",
            summary=f"Emergency stop: {reason or 'user initiated'}",
            payload={
                "tasks_cancelled": tasks_cancelled,
                "automations_disabled": automations_disabled,
                "pending_denied": pending_denied,
            },
        )
    except Exception:
        pass

    return {
        "tasks_cancelled": tasks_cancelled,
        "automations_disabled": automations_disabled,
        "pending_denied": pending_denied,
    }


def clear_emergency_stop(db: Session, user: User) -> dict:
    """Deactivate emergency stop. Does not re-enable automations."""
    user.emergency_stop = False
    user.emergency_stop_reason = None
    user.emergency_stop_at = None
    db.commit()

    try:
        log_quick(
            db, user.id,
            action="system.emergency_stop_cleared",
            summary="Emergency stop cleared",
        )
    except Exception:
        pass

    return {"cleared": True}


def check_and_reject_if_stopped(user: User):
    """
    Raise if user has emergency stop active.
    Call this from routes or from the tick endpoint.
    """
    from fastapi import HTTPException
    if is_stopped(user):
        raise HTTPException(
            status_code=423,  # Locked
            detail="Emergency stop is active. Clear it in Settings → Security to resume.",
        )