from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.learn import LearnSession
from app.models.note import Note
from app.models.practice import PracticeTest


router = APIRouter(prefix="/library", tags=["library"])


@router.get("")
def list_library(
    type: str = Query("all", pattern="^(all|sessions|notes|tests)$"),
    search: str | None = Query(None, max_length=200),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unified library — aggregates Learn sessions, Notes, and Practice Tests."""
    items: list[dict] = []

    # ── Sessions ──
    if type in ("all", "sessions"):
        stmt = (
            select(LearnSession)
            .where(LearnSession.user_id == current_user.id)
            .order_by(LearnSession.created_at.desc())
            .limit(limit)
        )
        for s in db.execute(stmt).scalars().all():
            items.append({
                "id": str(s.id),
                "type": "session",
                "title": s.title,
                "preview": (s.summary or "")[:200],
                "subject": s.subject,
                "created_at": s.created_at.isoformat(),
                "meta": {
                    "source": s.source_type,
                    "url": f"/app/learn/{s.id}",
                },
            })

    # ── Notes ──
    if type in ("all", "notes"):
        stmt = (
            select(Note)
            .where(Note.user_id == current_user.id)
            .order_by(Note.updated_at.desc())
            .limit(limit)
        )
        for n in db.execute(stmt).scalars().all():
            items.append({
                "id": str(n.id),
                "type": "note",
                "title": n.title or "Untitled",
                "preview": (n.body or "")[:200],
                "subject": n.subject,
                "created_at": n.updated_at.isoformat(),
                "meta": {
                    "pinned": n.pinned,
                    "url": "/app/notes",
                },
            })

    # ── Practice Tests ──
    if type in ("all", "tests"):
        stmt = (
            select(PracticeTest)
            .where(PracticeTest.user_id == current_user.id)
            .order_by(PracticeTest.created_at.desc())
            .limit(limit)
        )
        for t in db.execute(stmt).scalars().all():
            items.append({
                "id": str(t.id),
                "type": "test",
                "title": t.title,
                "preview": f"{len(t.questions or [])} questions · {t.duration_minutes} min",
                "subject": t.subject,
                "created_at": t.created_at.isoformat(),
                "meta": {
                    "score": t.score,
                    "passed": t.passed,
                    "submitted": t.submitted_at is not None,
                    "url": f"/app/learn/practice/{t.id}",
                },
            })

    # ── Search filter ──
    if search:
        q = search.lower()
        items = [
            i for i in items
            if q in i["title"].lower() or q in (i["preview"] or "").lower()
        ]

    # ── Sort by date, newest first ──
    items.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "count": len(items),
        "items": items[:limit],
    }


@router.get("/stats")
def library_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Quick counts per type."""
    from sqlalchemy import func

    sessions = db.execute(
        select(func.count()).select_from(LearnSession)
        .where(LearnSession.user_id == current_user.id)
    ).scalar() or 0

    notes = db.execute(
        select(func.count()).select_from(Note)
        .where(Note.user_id == current_user.id)
    ).scalar() or 0

    tests = db.execute(
        select(func.count()).select_from(PracticeTest)
        .where(PracticeTest.user_id == current_user.id)
    ).scalar() or 0

    return {
        "sessions": sessions,
        "notes": notes,
        "tests": tests,
        "total": sessions + notes + tests,
    }