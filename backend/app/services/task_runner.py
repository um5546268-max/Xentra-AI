import time
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.task import Task
from app.services.browser_agent import open_and_read


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
    Generic simulated task runner.
    Real logic per task type lives in dedicated runners below.
    """
    db = SessionLocal()
    try:
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
            state = _check_paused_or_cancelled(db, task_id)
            if state == "cancelled":
                return
            if state == "paused":
                while True:
                    time.sleep(0.5)
                    state = _check_paused_or_cancelled(db, task_id)
                    if state == "cancelled":
                        return
                    if state is None:
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


def run_browser_task(task_id, url: str):
    """
    Background browser task: open a URL and store title + text + screenshot in result.
    """
    db = SessionLocal()
    try:
        _update_task(db, task_id, status="running", progress=10)

        result = open_and_read(url)

        if result.get("error"):
            _update_task(
                db,
                task_id,
                status="failed",
                progress=100,
                result={"error": result["error"]},
            )
            return

        screenshot = result.get("screenshot_b64", "")
        if len(screenshot) > 500_000:
            screenshot = screenshot[:500_000]

        _update_task(
            db,
            task_id,
            status="done",
            progress=100,
            result={
                "url": result["url"],
                "title": result["title"],
                "text": result["text"][:3000],
                "screenshot_b64": screenshot,
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