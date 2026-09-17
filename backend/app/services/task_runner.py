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


def _get_steps_for_type(task_type: str) -> list[tuple[int, str]]:
    """Return progress steps appropriate for the task type."""
    if task_type == "research":
        return [
            (20, "Searching the web…"),
            (45, "Reading sources…"),
            (70, "Analyzing content…"),
            (90, "Compiling findings…"),
        ]
    if task_type == "shopping":
        return [
            (20, "Searching stores…"),
            (45, "Comparing prices…"),
            (70, "Checking reviews…"),
            (90, "Preparing recommendations…"),
        ]
    if task_type == "browser":
        return [
            (30, "Opening page…"),
            (60, "Reading content…"),
            (90, "Capturing screenshot…"),
        ]
    if task_type == "media":
        return [
            (30, "Searching library…"),
            (60, "Preparing playback…"),
            (90, "Starting…"),
        ]
    if task_type == "code":
        return [
            (20, "Analyzing code…"),
            (45, "Writing…"),
            (70, "Testing…"),
            (90, "Finalizing…"),
        ]
    # generic
    return [
        (20, "Analyzing request…"),
        (45, "Gathering information…"),
        (70, "Processing…"),
        (90, "Finalizing…"),
    ]


def run_task(task_id):
    """
    Generic simulated task runner.
    Supports pause/resume/cancel between steps.
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

        steps = _get_steps_for_type(task.type or "generic")

        for progress, note in steps:
            # Pause / cancel check before each step
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
                    if state is None:  # resumed
                        break

            _update_task(db, task_id, progress=progress)
            time.sleep(0.8)

        _update_task(
            db,
            task_id,
            status="done",
            progress=100,
            result={
                "message": f"{task.type or 'generic'} task completed.",
                "note": "Simulated — real logic per type coming in later phases.",
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
    Background browser task: open a URL and store title + text + screenshot.
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