from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.feedback import Feedback
from app.models.user import User


router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── Schemas ──
class FeedbackCreate(BaseModel):
    category: str = Field(default="general", pattern="^(bug|feature|general|praise)$")
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    message: str = Field(min_length=3, max_length=5000)
    page_url: Optional[str] = None
    screenshot_url: Optional[str] = None


class FeedbackRead(BaseModel):
    id: str
    category: str
    rating: Optional[int]
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ──
@router.post("", response_model=FeedbackRead, status_code=201)
def submit_feedback(
    payload: FeedbackCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Submit feedback. Guests allowed (user_id will be null)."""
    if not payload.message.strip():
        raise HTTPException(400, "Message is required")

    # Basic sanity: screenshot data URL size cap (~2 MB base64)
    if payload.screenshot_url and len(payload.screenshot_url) > 2_800_000:
        raise HTTPException(413, "Screenshot too large (max 2 MB)")

    fb = Feedback(
        user_id=current_user.id if current_user else None,
        category=payload.category,
        rating=payload.rating,
        message=payload.message.strip(),
        page_url=payload.page_url,
        user_agent=request.headers.get("user-agent", "")[:500],
        screenshot_url=payload.screenshot_url,
        status="new",
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return FeedbackRead(
        id=str(fb.id),
        category=fb.category,
        rating=fb.rating,
        message=fb.message,
        status=fb.status,
        created_at=fb.created_at,
    )


@router.get("/mine", response_model=list[FeedbackRead])
def my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The current user's own feedback history."""
    rows = db.execute(
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .limit(50)
    ).scalars().all()

    return [
        FeedbackRead(
            id=str(r.id),
            category=r.category,
            rating=r.rating,
            message=r.message,
            status=r.status,
            created_at=r.created_at,
        )
        for r in rows
    ]

# ═══════════════════════════════════════════════════════════════
# ADMIN — view and manage feedback
# ═══════════════════════════════════════════════════════════════
from app.deps import get_current_user
from app.models.user import User as UserModel
from typing import Optional as Opt


class FeedbackAdminRead(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    category: str
    rating: Optional[int]
    message: str
    page_url: Optional[str] = None
    user_agent: Optional[str] = None
    screenshot_url: Optional[str] = None
    status: str
    created_at: datetime


def _require_admin(current_user: UserModel) -> None:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(403, "Admin access required")


@router.get("/admin/list", response_model=list[FeedbackAdminRead])
def admin_list_feedback(
    status_filter: Opt[str] = None,
    category_filter: Opt[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """List all feedback. Admin only."""
    _require_admin(current_user)

    stmt = select(Feedback).order_by(Feedback.created_at.desc()).limit(min(limit, 500))

    if status_filter:
        stmt = stmt.where(Feedback.status == status_filter)
    if category_filter:
        stmt = stmt.where(Feedback.category == category_filter)

    rows = db.execute(stmt).scalars().all()

    result: list[FeedbackAdminRead] = []
    for r in rows:
        user = db.get(UserModel, r.user_id) if r.user_id else None
        result.append(
            FeedbackAdminRead(
                id=str(r.id),
                user_id=str(r.user_id) if r.user_id else None,
                user_email=user.email if user else None,
                user_name=user.full_name if user else None,
                category=r.category,
                rating=r.rating,
                message=r.message,
                page_url=r.page_url,
                user_agent=r.user_agent,
                screenshot_url=r.screenshot_url,
                status=r.status,
                created_at=r.created_at,
            )
        )

    return result


class FeedbackStatusUpdate(BaseModel):
    status: str  # "new" | "reviewing" | "resolved" | "closed"


@router.patch("/admin/{feedback_id}", response_model=FeedbackRead)
def admin_update_feedback_status(
    feedback_id: str,
    payload: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    """Update a feedback item's status. Admin only."""
    _require_admin(current_user)

    if payload.status not in {"new", "reviewing", "resolved", "closed"}:
        raise HTTPException(400, "Invalid status")

    import uuid as _uuid
    try:
        fid = _uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(400, "Invalid ID")

    fb = db.get(Feedback, fid)
    if not fb:
        raise HTTPException(404, "Feedback not found")

    fb.status = payload.status
    db.commit()
    db.refresh(fb)

    return FeedbackRead(
        id=str(fb.id),
        category=fb.category,
        rating=fb.rating,
        message=fb.message,
        status=fb.status,
        created_at=fb.created_at,
    )