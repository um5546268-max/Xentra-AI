import time
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.task import Task


def _update_task(db: Session, task_id, **kwargs):
    """Update task fields and commit."""
    task = db.get(Task, task_id)
    if not task:
        return None
    for k, v in kwargs.items():
        setattr(task, k, v)
    db.commit()
    db.refresh(task)
    return task


def _check_paused_or_cancelled(db: Session, task_id) -> str | None:
    """Return the current status if it's paused or cancelled, else None."""
    task = db.get(Task, task_id)
    if not task:
        return "cancelled"
    if task.status in ("paused", "cancelled"):
        return task.status
    return None


def run_task(task_id):
    """
    Background task runner.
    Checks status between steps to support pause / cancel.
    """
    db = SessionLocal()
    try:
        # Don't override if user already cancelled
        task = db.get(Task, task_id)
        if not task:
            return
        if task.status == "cancelled":
            return

        _update_task(db, task_id, status="running", progress=5)
        time.sleep(0.5)

        steps = [
            (20, "Analyzing request…"),
            (45, "Gathering information…"),
            (70, "Processing…"),
            (90, "Finalizing…"),
        ]

        for progress, note in steps:
            # Pause / cancel check BEFORE each step
            state = _check_paused_or_cancelled(db, task_id)
            if state == "cancelled":
                return
            if state == "paused":
                # Poll until resumed or cancelled
                while True:
                    time.sleep(0.5)
                    state = _check_paused_or_cancelled(db, task_id)
                    if state == "cancelled":
                        return
                    if state is None:  # resumed (status set back to running)
                        break

            _update_task(db, task_id, progress=progress)
            time.sleep(0.8)

        _update_task(
            db,
            task_id,
            status="done",
            progress=100,
            result={
                "message": "Task completed (simulated).",
                "finished_at": datetime.utcnow().isoformat(),
            },
        )
    except Exception as e:
        _update_task(
            db,
            task_id,
            status="failed",
            result={"error": str(e)},
        )
    finally:
        db.close()