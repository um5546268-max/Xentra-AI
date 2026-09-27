from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, func, or_, desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.feedback import Feedback
from app.models.user import User


router = APIRouter(prefix="/feedback", tags=["feedback"])


# ── Schemas ───────────────────────────────────────────────────────────
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


class FeedbackAdminRead(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    category: str
    rating: Optional[int]
    message: str
    page_url: Optional[str] = None
    user_agent: Optional[str] = None
    screenshot_url: Optional[str] = None
    status: str
    meta: Optional[dict] = None
    created_at: datetime


class FeedbackStatusUpdate(BaseModel):
    status: str  # "new" | "reviewing" | "resolved" | "closed"


class FeedbackReply(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class BulkAction(BaseModel):
    ids: List[str]
    action: str  # "read" | "resolved" | "closed" | "delete"


# ── Admin guard ───────────────────────────────────────────────────────
def _require_admin(current_user: User) -> None:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(403, "Admin access required")


# ── Public endpoints ─────────────────────────────────────────────────
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


# ── Admin endpoints ───────────────────────────────────────────────────
def _to_admin_read(db: Session, r: Feedback) -> FeedbackAdminRead:
    user = db.get(User, r.user_id) if r.user_id else None
    return FeedbackAdminRead(
        id=str(r.id),
        user_id=str(r.user_id) if r.user_id else None,
        user_email=user.email if user else None,
        user_name=user.full_name if user else None,
        user_avatar=getattr(user, "avatar_url", None) if user else None,
        category=r.category,
        rating=r.rating,
        message=r.message,
        page_url=r.page_url,
        user_agent=r.user_agent,
        screenshot_url=r.screenshot_url,
        status=r.status,
        meta=r.meta or {},
        created_at=r.created_at,
    )


@router.get("/admin/list", response_model=dict)
def admin_list_feedback(
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all feedback with filters + pagination. Admin only."""
    _require_admin(current_user)

    limit = max(1, min(limit, 100))
    page = max(1, page)

    stmt = select(Feedback)

    if status_filter and status_filter != "all":
        stmt = stmt.where(Feedback.status == status_filter)
    if category_filter and category_filter != "all":
        stmt = stmt.where(Feedback.category == category_filter)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Feedback.message.ilike(like), Feedback.page_url.ilike(like))
        )

    total = db.execute(
        select(func.count()).select_from(stmt.subquery())
    ).scalar() or 0

    stmt = stmt.order_by(desc(Feedback.created_at)).offset((page - 1) * limit).limit(limit)
    rows = db.execute(stmt).scalars().all()

    return {
        "items": [_to_admin_read(db, r) for r in rows],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/admin/stats")
def admin_feedback_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Summary stats for the admin dashboard. Admin only."""
    _require_admin(current_user)

    total = db.query(func.count(Feedback.id)).scalar() or 0
    new_count = (
        db.query(func.count(Feedback.id))
        .filter(Feedback.status == "new")
        .scalar()
        or 0
    )
    avg_rating = (
        db.query(func.avg(Feedback.rating))
        .filter(Feedback.rating.isnot(None))
        .scalar()
    )
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    this_week = (
        db.query(func.count(Feedback.id))
        .filter(Feedback.created_at >= week_ago)
        .scalar()
        or 0
    )
    by_status = dict(
        db.query(Feedback.status, func.count(Feedback.id))
        .group_by(Feedback.status)
        .all()
    )
    by_category = dict(
        db.query(Feedback.category, func.count(Feedback.id))
        .group_by(Feedback.category)
        .all()
    )

    return {
        "total": total,
        "new": new_count,
        "avg_rating": round(float(avg_rating), 2) if avg_rating else None,
        "this_week": this_week,
        "by_status": by_status,
        "by_category": by_category,
    }


@router.get("/admin/{feedback_id}", response_model=FeedbackAdminRead)
def admin_get_one(
    feedback_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch a single feedback item. Admin only."""
    _require_admin(current_user)

    import uuid as _uuid
    try:
        fid = _uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(400, "Invalid ID")

    fb = db.get(Feedback, fid)
    if not fb:
        raise HTTPException(404, "Feedback not found")

    return _to_admin_read(db, fb)


@router.patch("/admin/{feedback_id}", response_model=FeedbackAdminRead)
def admin_update_feedback(
    feedback_id: str,
    payload: FeedbackStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    return _to_admin_read(db, fb)


@router.post("/admin/{feedback_id}/reply", response_model=FeedbackAdminRead)
def admin_reply_feedback(
    feedback_id: str,
    payload: FeedbackReply,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a reply to the feedback author and mark resolved. Admin only."""
    _require_admin(current_user)

    import uuid as _uuid
    try:
        fid = _uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(400, "Invalid ID")

    fb = db.get(Feedback, fid)
    if not fb:
        raise HTTPException(404, "Feedback not found")

    fb.meta = {
        **(fb.meta or {}),
        "reply": payload.message.strip(),
        "replied_at": datetime.now(timezone.utc).isoformat(),
        "replied_by": str(current_user.id),
    }
    fb.status = "resolved"
    db.commit()
    db.refresh(fb)

    # Optional email — uncomment once you add a mail service
    # from app.services.email import send_email
    # if fb.user_id:
    #     user = db.get(User, fb.user_id)
    #     if user and user.email:
    #         send_email(user.email, "Re: your feedback", payload.message)

    return _to_admin_read(db, fb)


@router.delete("/admin/{feedback_id}")
def admin_delete_feedback(
    feedback_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a feedback item. Admin only."""
    _require_admin(current_user)

    import uuid as _uuid
    try:
        fid = _uuid.UUID(feedback_id)
    except ValueError:
        raise HTTPException(400, "Invalid ID")

    fb = db.get(Feedback, fid)
    if not fb:
        raise HTTPException(404, "Feedback not found")

    db.delete(fb)
    db.commit()
    return {"ok": True}


@router.post("/admin/bulk")
def admin_bulk_action(
    body: BulkAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk status change or delete. Admin only."""
    _require_admin(current_user)

    if not body.ids:
        return {"ok": True, "affected": 0}

    import uuid as _uuid
    uuids = []
    for x in body.ids:
        try:
            uuids.append(_uuid.UUID(x))
        except ValueError:
            continue

    if not uuids:
        raise HTTPException(400, "No valid IDs")

    q = db.query(Feedback).filter(Feedback.id.in_(uuids))

    if body.action == "resolved":
        q.update({Feedback.status: "resolved"}, synchronize_session=False)
    elif body.action == "closed":
        q.update({Feedback.status: "closed"}, synchronize_session=False)
    elif body.action == "read":
        q.update({Feedback.status: "reviewing"}, synchronize_session=False)
    elif body.action == "delete":
        q.delete(synchronize_session=False)
    else:
        raise HTTPException(400, "Unknown action")

    db.commit()
    return {"ok": True, "affected": len(uuids)}