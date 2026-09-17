from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.system import (
    EmergencyStopRequest,
    EmergencyStopResponse,
)
from app.services.emergency import (
    activate_emergency_stop,
    clear_emergency_stop,
    is_stopped,
)

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/status", response_model=EmergencyStopResponse)
def status(
    current_user: User = Depends(get_current_user),
):
    """Get current emergency stop status."""
    return EmergencyStopResponse(
        active=bool(getattr(current_user, "emergency_stop", False)),
        reason=current_user.emergency_stop_reason,
        stopped_at=(
            current_user.emergency_stop_at.isoformat()
            if current_user.emergency_stop_at
            else None
        ),
    )


@router.post("/emergency-stop", response_model=EmergencyStopResponse)
def stop(
    payload: EmergencyStopRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    EMERGENCY STOP: halt everything for the current user.
    Cancels all tasks, disables automations, denies pending actions.
    """
    summary = activate_emergency_stop(db, current_user, payload.reason)
    db.refresh(current_user)

    return EmergencyStopResponse(
        active=True,
        reason=current_user.emergency_stop_reason,
        stopped_at=current_user.emergency_stop_at.isoformat() if current_user.emergency_stop_at else None,
        tasks_cancelled=summary["tasks_cancelled"],
        automations_disabled=summary["automations_disabled"],
        pending_denied=summary["pending_denied"],
    )


@router.post("/emergency-stop/clear", response_model=EmergencyStopResponse)
def clear(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clear emergency stop. Automations remain disabled until manually re-enabled."""
    clear_emergency_stop(db, current_user)
    db.refresh(current_user)
    return EmergencyStopResponse(
        active=False,
        reason=None,
        stopped_at=None,
    )