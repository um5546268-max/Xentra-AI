"""
Hive OS — Bee orchestration layer.
One Bee = one running agent task.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.bee import (
    BeeTask,
    BeeCheckpoint,
    BeePermission,
    BEE_QUOTA,
    BEE_TYPES,
)
from app.models.user import User


def _now():
    return datetime.now(timezone.utc)


# ═══════════════════════════════════════════════════════════════
# QUOTA
# ═══════════════════════════════════════════════════════════════
def get_user_quota(db: Session, user: User) -> int:
    plan = (getattr(user, "plan", "free") or "free").lower()
    return BEE_QUOTA.get(plan, BEE_QUOTA["free"])


def get_active_bees_count(db: Session, user_id: uuid.UUID) -> int:
    stmt = (
        select(func.count(BeeTask.id))
        .where(BeeTask.user_id == user_id)
        .where(BeeTask.status.in_(["queued", "running"]))
    )
    return db.execute(stmt).scalar_one()


def assert_can_spawn(db: Session, user: User) -> None:
    quota = get_user_quota(db, user)
    active = get_active_bees_count(db, user.id)
    if active >= quota:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"All {quota} Bees are busy. Stop a task or upgrade your plan.",
        )


# ═══════════════════════════════════════════════════════════════
# TASK LIFECYCLE
# ═══════════════════════════════════════════════════════════════
def spawn_bee(
    db: Session,
    user: User,
    bee_type: str,
    title: str,
    description: str | None = None,
    goal_dna: dict | None = None,
    parent_task_id: uuid.UUID | None = None,
    reversible: bool = False,
) -> BeeTask:
    if bee_type not in BEE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown bee_type: {bee_type}")

    assert_can_spawn(db, user)

    task = BeeTask(
        user_id=user.id,
        bee_type=bee_type,
        title=title[:255],
        description=description,
        goal_dna=goal_dna or {},
        parent_task_id=parent_task_id,
        status="queued",
        progress=0,
        reversible=reversible,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    checkpoint(db, task, label=f"Bee spawned: {title}", kind="info")
    return task


def start_bee(db: Session, task_id: uuid.UUID, user_id: uuid.UUID) -> BeeTask:
    task = _get_owned(db, task_id, user_id)
    task.status = "running"
    task.started_at = _now()
    db.commit()
    db.refresh(task)
    return task


def update_progress(
    db: Session,
    task_id: uuid.UUID,
    user_id: uuid.UUID,
    progress: int,
    tool_call: dict | None = None,
) -> BeeTask:
    task = _get_owned(db, task_id, user_id)
    task.progress = max(0, min(100, progress))
    if tool_call:
        calls = list(task.tool_calls or [])
        calls.append({**tool_call, "at": _now().isoformat()})
        task.tool_calls = calls
    db.commit()
    db.refresh(task)
    return task


def finish_bee(
    db: Session,
    task_id: uuid.UUID,
    user_id: uuid.UUID,
    result: dict | None = None,
    error: str | None = None,
    result_url: str | None = None,
) -> BeeTask:
    task = _get_owned(db, task_id, user_id)
    task.status = "failed" if error else "running"  # stays "running" until verified
    task.progress = 100 if not error else task.progress
    task.result = result
    task.result_url = result_url
    task.error = error
    task.finished_at = _now()
    db.commit()
    db.refresh(task)
    return task


def stop_bee(db: Session, task_id: uuid.UUID, user_id: uuid.UUID) -> BeeTask:
    task = _get_owned(db, task_id, user_id)
    if not task.stoppable:
        raise HTTPException(status_code=409, detail="This Bee cannot be stopped")
    task.status = "stopped"
    task.finished_at = _now()
    db.commit()
    db.refresh(task)
    checkpoint(db, task, label="Emergency stop", kind="info")
    return task


def stop_all_bees(db: Session, user_id: uuid.UUID) -> int:
    stmt = (
        select(BeeTask)
        .where(BeeTask.user_id == user_id)
        .where(BeeTask.status.in_(["queued", "running"]))
    )
    tasks = db.execute(stmt).scalars().all()
    for t in tasks:
        if t.stoppable:
            t.status = "stopped"
            t.finished_at = _now()
    db.commit()
    return len(tasks)


# ═══════════════════════════════════════════════════════════════
# REALITY CHECK
# ═══════════════════════════════════════════════════════════════
def verify_bee(
    db: Session,
    task_id: uuid.UUID,
    user_id: uuid.UUID,
    verification: dict,
) -> BeeTask:
    task = _get_owned(db, task_id, user_id)
    task.verified = bool(verification.get("passed"))
    task.verification = verification
    task.status = "verified" if task.verified else "failed"
    db.commit()
    db.refresh(task)
    checkpoint(
        db,
        task,
        label="Verification: passed" if task.verified else "Verification: failed",
        kind="verify",
    )
    return task


# ═══════════════════════════════════════════════════════════════
# AI TIME MACHINE
# ═══════════════════════════════════════════════════════════════
def checkpoint(
    db: Session,
    task: BeeTask,
    label: str,
    kind: str = "info",
    payload: dict | None = None,
    reversible: bool = False,
) -> BeeCheckpoint:
    cp = BeeCheckpoint(
        task_id=task.id,
        user_id=task.user_id,
        label=label,
        kind=kind,
        payload=payload,
        reversible=reversible,
    )
    db.add(cp)
    db.commit()
    db.refresh(cp)
    return cp


def list_checkpoints(db: Session, task_id: uuid.UUID, user_id: uuid.UUID):
    _get_owned(db, task_id, user_id)
    stmt = (
        select(BeeCheckpoint)
        .where(BeeCheckpoint.task_id == task_id)
        .order_by(BeeCheckpoint.created_at.asc())
    )
    return db.execute(stmt).scalars().all()


def undo_to_checkpoint(
    db: Session,
    task_id: uuid.UUID,
    user_id: uuid.UUID,
    checkpoint_id: uuid.UUID,
) -> dict:
    task = _get_owned(db, task_id, user_id)
    cp = db.get(BeeCheckpoint, checkpoint_id)
    if not cp or cp.task_id != task.id:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    if not cp.reversible:
        return {
            "reversed": False,
            "reason": "This action cannot be guaranteed to be reversed.",
        }
    task.status = "undone"
    checkpoint(db, task, label=f"Undid: {cp.label}", kind="undo")
    return {"reversed": True, "checkpoint": str(cp.id)}


# ═══════════════════════════════════════════════════════════════
# PERMISSIONS
# ═══════════════════════════════════════════════════════════════
RISK_RULES = {
    # low — auto-allowed
    "search": "low",
    "read": "low",
    "analyze": "low",
    "calculate": "low",
    "system_info": "low",
    # medium — ask
    "send_message": "medium",
    "upload_file": "medium",
    "modify_settings": "medium",
    "install_software": "medium",
    # high — always ask
    "purchase": "high",
    "payment": "high",
    "delete_files": "high",
    "change_security": "high",
    "send_sensitive": "high",
}


def request_permission(
    db: Session,
    user: User,
    task_id: uuid.UUID | None,
    action: str,
    detail: str | None = None,
) -> BeePermission:
    risk = RISK_RULES.get(action, "medium")
    perm = BeePermission(
        user_id=user.id,
        task_id=task_id,
        risk=risk,
        action=action,
        detail=detail,
        status="granted" if risk == "low" else "pending",
        granted_at=_now() if risk == "low" else None,
    )
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


def grant_permission(db: Session, perm_id: uuid.UUID, user_id: uuid.UUID):
    perm = db.get(BeePermission, perm_id)
    if not perm or perm.user_id != user_id:
        raise HTTPException(status_code=404, detail="Permission not found")
    perm.status = "granted"
    perm.granted_at = _now()
    db.commit()
    db.refresh(perm)
    return perm


def deny_permission(db: Session, perm_id: uuid.UUID, user_id: uuid.UUID):
    perm = db.get(BeePermission, perm_id)
    if not perm or perm.user_id != user_id:
        raise HTTPException(status_code=404, detail="Permission not found")
    perm.status = "denied"
    db.commit()
    db.refresh(perm)
    return perm


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════
def _get_owned(db: Session, task_id: uuid.UUID, user_id: uuid.UUID) -> BeeTask:
    task = db.get(BeeTask, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Bee task not found")
    return task


def list_bees(
    db: Session,
    user_id: uuid.UUID,
    active_only: bool = False,
):
    stmt = select(BeeTask).where(BeeTask.user_id == user_id)
    if active_only:
        stmt = stmt.where(BeeTask.status.in_(["queued", "running"]))
    stmt = stmt.order_by(BeeTask.created_at.desc()).limit(100)
    return db.execute(stmt).scalars().all()


def hive_summary(db: Session, user: User) -> dict:
    quota = get_user_quota(db, user)
    stmt = (
        select(BeeTask)
        .where(BeeTask.user_id == user.id)
        .where(BeeTask.status.in_(["queued", "running"]))
        .order_by(BeeTask.created_at.desc())
    )
    active = db.execute(stmt).scalars().all()
    return {
        "quota": quota,
        "active": len(active),
        "busy": len(active) >= quota,
        "bees": [
            {
                "id": str(t.id),
                "type": t.bee_type,
                "title": t.title,
                "progress": t.progress,
                "status": t.status,
                "stoppable": t.stoppable,
            }
            for t in active
        ],
    }