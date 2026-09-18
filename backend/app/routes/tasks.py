import uuid
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.task import Task
from app.models.conversation import Conversation
from app.schemas.task import TaskCreate, TaskUpdate, TaskRead
from app.services.billing import check_and_record
from app.services.audit import log_quick

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ============================================================
# List / Create / Get / Update / Delete
# ============================================================

@router.get("", response_model=list[TaskRead])
def list_tasks(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Task).where(Task.user_id == current_user.id)
    if status_filter:
        stmt = stmt.where(Task.status == status_filter)
    stmt = stmt.order_by(Task.created_at.desc())
    return db.execute(stmt).scalars().all()


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task (status=queued). It will not run yet."""
    # Usage limit
    check_and_record(db, current_user.id, "tasks", 1)

    if payload.conversation_id:
        convo = db.get(Conversation, payload.conversation_id)
        if not convo or convo.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")

    task = Task(
        user_id=current_user.id,
        conversation_id=payload.conversation_id,
        type=payload.type,
        status="queued",
        progress=0,
        payload=payload.payload or {},
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.status is not None:
        task.status = payload.status
    if payload.progress is not None:
        task.progress = payload.progress
    if payload.result is not None:
        task.result = payload.result

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None


# ============================================================
# Run / Pause / Resume / Cancel / Retry
# ============================================================

@router.post("/{task_id}/run", response_model=TaskRead)
def run_task_endpoint(
    task_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kick off a task. Returns immediately; task runs in the background."""
    task = db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status == "running":
        raise HTTPException(status_code=409, detail="Task is already running")

    task.status = "queued"
    task.progress = 0
    task.result = None
    db.commit()
    db.refresh(task)

    # Route by task type
    if task.type == "browser":
        url = (task.payload or {}).get("url", "")
        if not url:
            raise HTTPException(
                status_code=400,
                detail="Browser task requires payload.url",
            )
        from app.services.task_runner import run_browser_task
        background_tasks.add_task(run_browser_task, task.id, url)
    else:
        from app.services.task_runner import run_task
        background_tasks.add_task(run_task, task.id)

    return task


@router.post("/{task_id}/pause", response_model=TaskRead)
def pause_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != "running":
        raise HTTPException(status_code=409, detail="Only running tasks can be paused")

    task.status = "paused"
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/resume", response_model=TaskRead)
def resume_task(
    task_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != "paused":
        raise HTTPException(status_code=409, detail="Only paused tasks can be resumed")

    task.status = "running"
    db.commit()
    db.refresh(task)

    from app.services.task_runner import run_task
    background_tasks.add_task(run_task, task.id)
    return task


@router.post("/{task_id}/cancel", response_model=TaskRead)
def cancel_task(
    task_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status in ("done", "failed"):
        raise HTTPException(status_code=409, detail="Task already finished")

    task.status = "cancelled"
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/retry", response_model=TaskRead)
def retry_task(
    task_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = "queued"
    task.progress = 0
    task.result = None
    db.commit()
    db.refresh(task)

    from app.services.task_runner import run_task
    background_tasks.add_task(run_task, task.id)
    return task