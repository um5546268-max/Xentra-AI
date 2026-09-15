from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.google import (
    get_profile,
    list_gmail_messages,
    list_calendar_events,
)

router = APIRouter(prefix="/google", tags=["google"])


@router.get("/profile")
async def profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return Google profile info for the connected account."""
    return await get_profile(db, current_user)


@router.get("/gmail")
async def gmail(
    max_results: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List recent inbox emails."""
    messages = await list_gmail_messages(db, current_user, max_results)
    return {"count": len(messages), "messages": messages}


@router.get("/calendar")
async def calendar(
    max_results: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List upcoming calendar events."""
    events = await list_calendar_events(db, current_user, max_results)
    return {"count": len(events), "events": events}