import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.feature_flag import FeatureFlag
from app.models.announcement import Announcement
from app.models.notification import Notification
from app.services.feature_flags import list_flags, upsert_flag
from pydantic import BaseModel, Field

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
# ============================================================
# Feature flags
# ============================================================

class FeatureFlagRead(BaseModel):
    id: uuid.UUID
    key: str
    description: str | None
    enabled: bool
    rollout_percent: int
    enabled_for_users: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeatureFlagUpdate(BaseModel):
    enabled: bool | None = None
    rollout_percent: int | None = Field(default=None, ge=0, le=100)
    description: str | None = None
    enabled_for_users: dict | None = None


@router.get("/feature-flags", response_model=list[FeatureFlagRead])
def get_feature_flags(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return list_flags(db)


@router.put("/feature-flags/{key}", response_model=FeatureFlagRead)
def set_feature_flag(
    key: str,
    payload: FeatureFlagUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    flag = upsert_flag(
        db,
        key=key,
        enabled=payload.enabled,
        rollout_percent=payload.rollout_percent,
        enabled_for_users=payload.enabled_for_users,
        description=payload.description,
    )
    return flag


# ============================================================
# Announcements
# ============================================================

class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    body: str | None = None
    level: str = Field(default="info", pattern="^(info|success|warning|error)$")
    target: str = Field(default="all", pattern="^(all|admins)$")
    dismissible: bool = True


class AnnouncementRead(BaseModel):
    id: uuid.UUID
    title: str
    body: str | None
    level: str
    active: bool
    dismissible: bool
    target: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("/announcements", response_model=AnnouncementRead, status_code=201)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Create an announcement AND notify every user."""
    ann = Announcement(
        title=payload.title,
        body=payload.body,
        level=payload.level,
        target=payload.target,
        dismissible=payload.dismissible,
        active=True,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    # Notify all users (or just admins)
    if payload.target == "all":
        users = db.execute(select(User)).scalars().all()
    else:
        users = db.execute(select(User).where(User.is_admin == True)).scalars().all()  # noqa: E712

    from app.services.notifications import create_notification
    for u in users:
        try:
            create_notification(
                db,
                u.id,
                title=f"📢 {payload.title}",
                body=payload.body,
                level=payload.level,
                source="announcement",
                source_id=ann.id,
                link="/app",
            )
        except Exception as e:
            print(f"[announcement] notify {u.email} failed: {e}")

    return ann


@router.get("/announcements", response_model=list[AnnouncementRead])
def list_announcements(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return db.execute(
        select(Announcement).order_by(Announcement.created_at.desc()).limit(100)
    ).scalars().all()


@router.delete("/announcements/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: uuid.UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    ann = db.get(Announcement, announcement_id)
    if not ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(ann)
    db.commit()
    return None


# ============================================================
# System health
# ============================================================

@router.get("/health")
def admin_health(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Quick health check of core systems."""
    from datetime import timezone as _tz
    from sqlalchemy import text as _text

    health = {
        "database": "unknown",
        "ai_provider": "unknown",
        "checked_at": datetime.now(_tz.utc).isoformat(),
    }

    # Database ping
    try:
        db.execute(_text("SELECT 1"))
        health["database"] = "ok"
    except Exception as e:
        health["database"] = f"error: {str(e)[:100]}"

    # AI provider check
    try:
        from app.config import settings as _s
        health["ai_provider"] = "configured" if _s.GROQ_API_KEY else "missing_key"
    except Exception as e:
        health["ai_provider"] = f"error: {str(e)[:100]}"

    # Last error
    from app.models.audit_log import AuditLog
    last_error = db.execute(
        select(AuditLog)
        .where(AuditLog.status == "failed")
        .order_by(AuditLog.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if last_error:
        health["last_error"] = {
            "action": last_error.action,
            "error": (last_error.error or "")[:200],
            "at": last_error.created_at.isoformat(),
        }

    return health