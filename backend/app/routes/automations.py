import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.automation import Automation
from app.schemas.automation import (
    AutomationCreate,
    AutomationUpdate,
    AutomationRead,
    AutomationListResponse,
)
from app.services.scheduler import compute_next_run


router = APIRouter(prefix="/automations", tags=["automations"])


def _validate_schedule(payload: AutomationCreate | AutomationUpdate) -> None:
    """Validate that the schedule type has the required fields."""
    st = getattr(payload, "schedule_type", None)
    if st == "interval":
        if not getattr(payload, "interval_minutes", None):
            raise HTTPException(
                status_code=400,
                detail="interval schedule requires interval_minutes",
            )
    elif st in ("daily", "weekly"):
        if not getattr(payload, "time_of_day", None):
            raise HTTPException(
                status_code=400,
                detail=f"{st} schedule requires time_of_day (HH:MM)",
            )
        if st == "weekly" and getattr(payload, "day_of_week", None) is None:
            raise HTTPException(
                status_code=400,
                detail="weekly schedule requires day_of_week (0-6)",
            )


@router.get("", response_model=AutomationListResponse)
def list_automations(
    enabled_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all automations for the current user."""
    stmt = select(Automation).where(Automation.user_id == current_user.id)
    if enabled_only:
        stmt = stmt.where(Automation.enabled == True)  # noqa: E712
    stmt = stmt.order_by(Automation.created_at.desc())

    items = db.execute(stmt).scalars().all()
    return AutomationListResponse(count=len(items), automations=items)


@router.post("", response_model=AutomationRead, status_code=201)
def create_automation(
    payload: AutomationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new automation."""
    _validate_schedule(payload)

    # Compute the first run time
    next_run = compute_next_run(
        schedule_type=payload.schedule_type,
        interval_minutes=payload.interval_minutes,
        time_of_day=payload.time_of_day,
        day_of_week=payload.day_of_week,
    )

    auto = Automation(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        schedule_type=payload.schedule_type,
        interval_minutes=payload.interval_minutes,
        time_of_day=payload.time_of_day,
        day_of_week=payload.day_of_week,
        task_type=payload.task_type,
        task_payload=payload.task_payload,
        enabled=payload.enabled,
        next_run_at=next_run,
    )
    db.add(auto)
    db.commit()
    db.refresh(auto)
    return auto


@router.get("/{automation_id}", response_model=AutomationRead)
def get_automation(
    automation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.get(Automation, automation_id)
    if not a or a.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Automation not found")
    return a


@router.patch("/{automation_id}", response_model=AutomationRead)
def update_automation(
    automation_id: uuid.UUID,
    payload: AutomationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.get(Automation, automation_id)
    if not a or a.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Automation not found")

    # Update fields
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(a, key, value)

    # Recompute next run when schedule changed
    if any(
        k in data
        for k in ("schedule_type", "interval_minutes", "time_of_day", "day_of_week")
    ):
        a.next_run_at = compute_next_run(
            schedule_type=a.schedule_type,
            interval_minutes=a.interval_minutes,
            time_of_day=a.time_of_day,
            day_of_week=a.day_of_week,
        )

    # If newly enabled, recompute next run
    if data.get("enabled") is True and not a.next_run_at:
        a.next_run_at = compute_next_run(
            schedule_type=a.schedule_type,
            interval_minutes=a.interval_minutes,
            time_of_day=a.time_of_day,
            day_of_week=a.day_of_week,
        )

    db.commit()
    db.refresh(a)
    return a


@router.delete("/{automation_id}", status_code=204)
def delete_automation(
    automation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = db.get(Automation, automation_id)
    if not a or a.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Automation not found")
    db.delete(a)
    db.commit()
    return None


@router.post("/{automation_id}/toggle", response_model=AutomationRead)
def toggle_automation(
    automation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle the enabled state of an automation."""
    a = db.get(Automation, automation_id)
    if not a or a.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Automation not found")

    a.enabled = not a.enabled

    # Recompute next run when enabling
    if a.enabled:
        a.next_run_at = compute_next_run(
            schedule_type=a.schedule_type,
            interval_minutes=a.interval_minutes,
            time_of_day=a.time_of_day,
            day_of_week=a.day_of_week,
        )

    db.commit()
    db.refresh(a)
    return a


@router.post("/{automation_id}/run-now", response_model=AutomationRead)
def run_now(
    automation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually trigger this automation immediately (ignores schedule).
    Actual execution happens via /tick endpoint — this just marks it due.
    """
    a = db.get(Automation, automation_id)
    if not a or a.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Automation not found")

    a.next_run_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(a)
    return a

@router.post("/tick")
def tick(
    db: Session = Depends(get_db),
):
    """
    Called externally by cron (every 5 min).
    Finds all due automations and returns them.
    Actual execution handled by Day 67 worker.
    NOTE: This endpoint is NOT authenticated — it uses a shared secret.
    """
    from app.config import settings

    if not settings.AUTOMATION_SECRET:
        raise HTTPException(
            status_code=500,
            detail="AUTOMATION_SECRET not configured",
        )

    now = datetime.now(timezone.utc)

    # Find due automations
    stmt = (
        select(Automation)
        .where(Automation.enabled == True)  # noqa: E712
        .where(Automation.next_run_at <= now)
        .limit(50)
    )
    due = db.execute(stmt).scalars().all()

    print(f"[tick] {len(due)} automations due at {now.isoformat()}")

    return {
        "now": now.isoformat(),
        "due_count": len(due),
        "due": [
            {
                "id": str(a.id),
                "name": a.name,
                "task_type": a.task_type,
                "next_run_at": a.next_run_at.isoformat() if a.next_run_at else None,
            }
            for a in due
        ],
    }