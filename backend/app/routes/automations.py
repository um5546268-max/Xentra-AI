import uuid
import threading
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.automation import Automation
from app.models.task import Task
from app.schemas.automation import (
    AutomationCreate,
    AutomationUpdate,
    AutomationRead,
    AutomationListResponse,
)
from app.services.scheduler import compute_next_run
from app.services.conditions import evaluate_condition
from app.services.notifications import create_notification
from app.services.task_runner import run_task, run_browser_task


router = APIRouter(prefix="/automations", tags=["automations"])


# ============================================================
# Helpers
# ============================================================

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


def _run_automation_task(db: Session, auto: Automation) -> uuid.UUID:
    """
    Create a Task and run it in a background thread.
    Returns the task id.
    """
    # Check user's emergency stop
    from app.services.emergency import is_stopped
    user = db.get(User, auto.user_id)
    if user and is_stopped(user):
        raise Exception("Emergency stop active for user")

    task = Task(
        user_id=auto.user_id,
        type=auto.task_type,
        status="queued",
        progress=0,
        payload=auto.task_payload or {},
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    def _run():
        from app.database import SessionLocal
        bg_db = SessionLocal()
        try:
            if task.type == "browser":
                url = (task.payload or {}).get("url", "")
                if url:
                    run_browser_task(task.id, url)
                else:
                    run_task(task.id)
            else:
                run_task(task.id)
        except Exception as e:
            print(f"[automation-task] Task {task.id} failed: {e}")
        finally:
            bg_db.close()

    threading.Thread(target=_run, daemon=True).start()
    return task.id


def _wait_for_task(db: Session, task_id: uuid.UUID, max_seconds: int = 15) -> Task | None:
    """Poll the task until it finishes or timeout."""
    for _ in range(max_seconds * 2):
        time.sleep(0.5)
        db.expire_all()
        t = db.get(Task, task_id)
        if t and t.status in ("done", "failed", "cancelled"):
            return t
    return db.get(Task, task_id)


# ============================================================
# CRUD
# ============================================================

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
        condition=payload.condition,
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

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(a, key, value)

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
    """Mark this automation as due immediately."""
    a = db.get(Automation, automation_id)
    if not a or a.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Automation not found")

    a.next_run_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(a)
    return a


# ============================================================
# Tick — the execution engine
# ============================================================

@router.post("/tick")
def tick(
    db: Session = Depends(get_db),
    secret: str = Query(default="", description="Shared secret (query param)"),
    x_automation_secret: str = Header(default="", alias="X-Automation-Secret"),
):
    """
    Called externally by cron (every 5 min).
    Finds due automations, runs them, evaluates conditions, and notifies.
    """
    from app.config import settings

    # Global emergency stop?
    if settings.GLOBAL_EMERGENCY_STOP:
        raise HTTPException(
            status_code=423,
            detail="Global emergency stop is active",
        )

    if not settings.AUTOMATION_SECRET:
        raise HTTPException(
            status_code=500,
            detail="AUTOMATION_SECRET not configured",
        )

    provided = secret or x_automation_secret
    if provided != settings.AUTOMATION_SECRET:
        raise HTTPException(status_code=401, detail="Invalid automation secret")

    now = datetime.now(timezone.utc)

    stmt = (
        select(Automation)
        .where(Automation.enabled == True)  # noqa: E712
        .where(Automation.next_run_at <= now)
        .limit(50)
    )
    due = db.execute(stmt).scalars().all()

    print(f"[tick] {len(due)} automations due at {now.isoformat()}")

    executed = []
    failed = []

    for auto in due:
        try:
            task_id = _run_automation_task(db, auto)

            finished_task = _wait_for_task(db, task_id, max_seconds=15)
            task_result = (finished_task.result if finished_task else {}) or {}

            condition = auto.condition or {"type": "always"}
            cond_result = evaluate_condition(condition, task_result)
            should_notify = cond_result.get("should_notify", True)

            if should_notify:
                level = "success"
                if finished_task and finished_task.status == "failed":
                    level = "error"

                body_lines = []
                if finished_task:
                    body_lines.append(f"Status: {finished_task.status}")
                if task_result.get("message"):
                    body_lines.append(task_result["message"])
                if task_result.get("error"):
                    body_lines.append(f"Error: {task_result['error']}")
                if cond_result.get("reason"):
                    body_lines.append(f"Condition: {cond_result['reason']}")

                try:
                    create_notification(
                        db,
                        auto.user_id,
                        title=f"⚙️ {auto.name}",
                        body=" · ".join(body_lines) if body_lines else None,
                        level=level,
                        source="automation",
                        source_id=auto.id,
                        link="/app/automations",
                        meta={
                            "task_id": str(task_id),
                            "condition": condition,
                            "condition_result": cond_result,
                        },
                    )
                    print(f"[tick]   ✓ Notification created for '{auto.name}'")
                except Exception as ne:
                    print(f"[tick]   ✗ Notification FAILED: {ne}")

            auto.last_run_at = now
            auto.run_count = (auto.run_count or 0) + 1
            auto.consecutive_failures = 0
            auto.last_error = None
            auto.next_run_at = compute_next_run(
                schedule_type=auto.schedule_type,
                interval_minutes=auto.interval_minutes,
                time_of_day=auto.time_of_day,
                day_of_week=auto.day_of_week,
                from_time=now,
            )
            db.commit()

            executed.append({
                "id": str(auto.id),
                "name": auto.name,
                "task_id": str(task_id),
                "task_status": finished_task.status if finished_task else "unknown",
                "condition_matched": should_notify,
                "condition_reason": cond_result.get("reason"),
                "next_run_at": auto.next_run_at.isoformat() if auto.next_run_at else None,
            })
            print(
                f"[tick] ✓ Ran '{auto.name}' (notify={should_notify}) "
                f"→ task {str(task_id)[:8]}"
            )

        except Exception as e:
            error_msg = str(e)[:300]
            print(f"[tick] ✗ Failed '{auto.name}': {error_msg}")

            auto.last_error = error_msg
            auto.consecutive_failures = (auto.consecutive_failures or 0) + 1
            auto.last_run_at = now

            try:
                create_notification(
                    db,
                    auto.user_id,
                    title=f"❌ {auto.name} failed",
                    body=error_msg,
                    level="error",
                    source="automation",
                    source_id=auto.id,
                    link="/app/automations",
                )
            except Exception:
                pass

            if auto.consecutive_failures >= 5:
                auto.enabled = False
                print(f"[tick] Auto-disabled '{auto.name}' after 5 failures")

            auto.next_run_at = compute_next_run(
                schedule_type=auto.schedule_type,
                interval_minutes=auto.interval_minutes,
                time_of_day=auto.time_of_day,
                day_of_week=auto.day_of_week,
                from_time=now,
            )
            db.commit()

            failed.append({
                "id": str(auto.id),
                "name": auto.name,
                "error": error_msg,
                "consecutive_failures": auto.consecutive_failures,
                "auto_disabled": not auto.enabled,
            })

    return {
        "now": now.isoformat(),
        "checked": len(due),
        "executed": len(executed),
        "failed": len(failed),
        "results": executed,
        "failures": failed,
    }