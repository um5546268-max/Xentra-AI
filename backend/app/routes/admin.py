import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.deps import require_admin
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.task import Task
from app.models.image import GeneratedImage
from app.models.file import UserFile
from app.models.automation import Automation
from app.models.subscription import Subscription
from app.models.plan import Plan
from app.models.usage import UsageRecord
from app.schemas.admin import (
    AdminUserRead,
    AdminUserListResponse,
    AdminStatsResponse,
    AdminUserUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================
# Dashboard stats
# ============================================================

@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Overview of the entire system."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    day_ago = now - timedelta(hours=24)

    total_users = db.query(User).count()
    new_users_7d = db.query(User).filter(User.created_at >= week_ago).count()

    total_conversations = db.query(Conversation).count()
    total_messages = db.query(Message).count()
    total_tasks = db.query(Task).count()
    tasks_running = db.query(Task).filter(Task.status == "running").count()
    total_images = db.query(GeneratedImage).count()
    total_files = db.query(UserFile).count()
    total_automations = db.query(Automation).count()
    automations_enabled = db.query(Automation).filter(Automation.enabled == True).count()  # noqa: E712

    # Active users in last 7 days (users who created a message)
    active_users_7d = db.execute(
        select(func.count(func.distinct(Conversation.user_id)))
        .where(Conversation.updated_at >= week_ago)
    ).scalar_one()

    # Usage in last 24h
    usage_rows = db.execute(
        select(
            UsageRecord.metric,
            func.sum(UsageRecord.amount),
        )
        .where(UsageRecord.created_at >= day_ago)
        .group_by(UsageRecord.metric)
    ).all()

    usage_last_24h = {metric: int(total or 0) for metric, total in usage_rows}

    # Plan distribution
    plan_rows = db.execute(
        select(Plan.slug, func.count(Subscription.id))
        .join(Subscription, Subscription.plan_id == Plan.id)
        .group_by(Plan.slug)
    ).all()
    plan_distribution = {slug: int(count or 0) for slug, count in plan_rows}

    return AdminStatsResponse(
        total_users=total_users,
        new_users_7d=new_users_7d,
        active_users_7d=int(active_users_7d or 0),
        total_conversations=total_conversations,
        total_messages=total_messages,
        total_tasks=total_tasks,
        tasks_running=tasks_running,
        total_images=total_images,
        total_files=total_files,
        total_automations=total_automations,
        automations_enabled=automations_enabled,
        usage_last_24h=usage_last_24h,
        plan_distribution=plan_distribution,
    )


# ============================================================
# User management
# ============================================================

@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    stmt = select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    if search:
        stmt = stmt.where(User.email.ilike(f"%{search}%"))

    users = db.execute(stmt).scalars().all()
    return AdminUserListResponse(count=len(users), users=users)


@router.get("/users/{user_id}", response_model=AdminUserRead)
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=AdminUserRead)
def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update user flags (is_admin, emergency_stop)."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = payload.model_dump(exclude_unset=True)

    # Don't let an admin demote themselves accidentally
    if "is_admin" in data and data["is_admin"] is False and user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot demote yourself",
        )

    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Hard-delete a user and all their data."""
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    db.delete(user)
    db.commit()
    return None