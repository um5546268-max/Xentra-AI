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