"""
Admin-only feedback management endpoints.
Mounted under /api/v1/admin/feedback (see main.py).

Requires the current user to have is_admin=True.
"""

import csv
import io
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy import func, or_, desc
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user
from app.models.feedback import Feedback
from app.models.user import User


router = APIRouter(prefix="/admin/feedback", tags=["admin-feedback"])


# ─── Auth guard ───────────────────────────────────────────────────────
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


# ─── Schemas ──────────────────────────────────────────────────────────
class FeedbackAdminRead(BaseModel):
    id: str
    user_id: Optional[str]
    user_email: Optional[str]
    user_name: Optional[str]
    user_avatar: Optional[str]
    category: str
    rating: Optional[int]
    message: str
    page_url: Optional[str]
    user_agent: Optional[str]
    screenshot_url: Optional[str]
    status: str
    meta: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackPatch(BaseModel):
    status: Optional[str] = None
    meta: Optional[dict] = None


class FeedbackReply(BaseModel):
    message: str


class BulkAction(BaseModel):
    ids: List[str]
    action: str  # "read" | "resolved" | "closed" | "delete"


class FeedbackListResponse(BaseModel):
    items: List[FeedbackAdminRead]
    total: int
    page: int
    limit: int
    pages: int


# ─── Helpers ──────────────────────────────────────────────────────────
def _to_admin_read(f: Feedback) -> FeedbackAdminRead:
    user = getattr(f, "user", None)
    return FeedbackAdminRead(
        id=str(f.id),
        user_id=str(f.user_id) if f.user_id else None,
        user_email=getattr(user, "email", None) if user else None,
        user_name=getattr(user, "full_name", None) if user else None,
        user_avatar=getattr(user, "avatar_url", None) if user else None,
        category=f.category,
        rating=f.rating,
        message=f.message,
        page_url=f.page_url,
        user_agent=f.user_agent,
        screenshot_url=f.screenshot_url,
        status=f.status,
        meta=f.meta or {},
        created_at=f.created_at,
    )


# ─── List with filters ────────────────────────────────────────────────
@router.get("", response_model=FeedbackListResponse)
def list_feedback(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    rating: Optional[int] = Query(None, ge=1, le=5),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Feedback).options(joinedload(Feedback.user))

    if status and status != "all":
        query = query.filter(Feedback.status == status)
    if category and category != "all":
        query = query.filter(Feedback.category == category)
    if rating:
        query = query.filter(Feedback.rating == rating)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Feedback.message.ilike(like),
                Feedback.page_url.ilike(like),
            )
        )

    total = query.count()
    rows = (
        query.order_by(desc(Feedback.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return FeedbackListResponse(
        items=[_to_admin_read(r) for r in rows],
        total=total,
        page=page,
        limit=limit,
        pages=(total + limit - 1) // limit,
    )


# ─── Stats ────────────────────────────────────────────────────────────
@router.get("/stats")
def feedback_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
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


# ─── Single ───────────────────────────────────────────────────────────
@router.get("/{fid}", response_model=FeedbackAdminRead)
def get_one(
    fid: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = (
        db.query(Feedback)
        .options(joinedload(Feedback.user))
        .filter(Feedback.id == fid)
        .first()
    )
    if not row:
        raise HTTPException(404, "Feedback not found")
    return _to_admin_read(row)


# ─── Patch (status, meta notes) ───────────────────────────────────────
@router.patch("/{fid}", response_model=FeedbackAdminRead)
def patch_one(
    fid: UUID,
    patch: FeedbackPatch,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(Feedback).filter(Feedback.id == fid).first()
    if not row:
        raise HTTPException(404, "Feedback not found")

    if patch.status is not None:
        if patch.status not in {"new", "reviewing", "resolved", "closed"}:
            raise HTTPException(400, "Invalid status")
        row.status = patch.status

    if patch.meta is not None:
        row.meta = {**(row.meta or {}), **patch.meta}

    db.commit()
    db.refresh(row)
    return _to_admin_read(row)


# ─── Reply (stores in meta.reply + sets status) ──────────────────────
@router.post("/{fid}/reply", response_model=FeedbackAdminRead)
def reply_one(
    fid: UUID,
    body: FeedbackReply,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    row = db.query(Feedback).filter(Feedback.id == fid).first()
    if not row:
        raise HTTPException(404, "Feedback not found")

    row.meta = {
        **(row.meta or {}),
        "reply": body.message,
        "replied_at": datetime.now(timezone.utc).isoformat(),
        "replied_by": str(admin.id),
    }
    row.status = "resolved"
    db.commit()
    db.refresh(row)

    # Optional: send email to row.user_email if you have mail configured
    # from app.services.email import send_email
    # if row.user and row.user.email:
    #     send_email(to=row.user.email, subject="Re: your feedback", body=body.message)

    return _to_admin_read(row)


# ─── Delete ───────────────────────────────────────────────────────────
@router.delete("/{fid}")
def delete_one(
    fid: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(Feedback).filter(Feedback.id == fid).first()
    if not row:
        raise HTTPException(404, "Feedback not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ─── Bulk ─────────────────────────────────────────────────────────────
@router.post("/bulk")
def bulk_action(
    body: BulkAction,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not body.ids:
        return {"ok": True, "affected": 0}

    try:
        uuids = [UUID(x) for x in body.ids]
    except ValueError:
        raise HTTPException(400, "Invalid UUID in ids")

    q = db.query(Feedback).filter(Feedback.id.in_(uuids))

    if body.action == "resolved":
        q.update({Feedback.status: "resolved"}, synchronize_session=False)
    elif body.action == "closed":
        q.update({Feedback.status: "closed"}, synchronize_session=False)
    elif body.action == "read":
        # No dedicated read column — treat as "reviewing"
        q.update({Feedback.status: "reviewing"}, synchronize_session=False)
    elif body.action == "delete":
        q.delete(synchronize_session=False)
    else:
        raise HTTPException(400, "Unknown action")

    db.commit()
    return {"ok": True, "affected": len(uuids)}


# ─── CSV export ───────────────────────────────────────────────────────
@router.get("/export.csv")
def export_csv(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Feedback).options(joinedload(Feedback.user))
    if status and status != "all":
        query = query.filter(Feedback.status == status)
    rows = query.order_by(desc(Feedback.created_at)).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["id", "created_at", "user_email", "user_name", "category", "rating", "status", "message"]
    )
    for f in rows:
        writer.writerow([
            str(f.id),
            f.created_at.isoformat(),
            getattr(f.user, "email", "") if f.user else "",
            getattr(f.user, "full_name", "") if f.user else "",
            f.category,
            f.rating or "",
            f.status,
            f.message.replace("\n", " "),
        ])
    csv_data = buf.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=feedback-export.csv"},
    )