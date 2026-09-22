from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.learn import LearnSession, Flashcard, QuizAttempt
from app.models.note import Note
from app.models.goal import Goal


router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/stats")
def get_progress_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Optimized progress stats. No Postgres-specific functions.
    ~8 queries, everything grouped in Python.
    """
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    # ─── 1. Fetch all sessions (user's, in window) — 1 query ───
    sessions = db.execute(
        select(LearnSession.created_at, LearnSession.subject)
        .where(
            LearnSession.user_id == current_user.id,
            LearnSession.created_at >= since,
        )
    ).all()

    # ─── 2. Fetch all reviewed cards in window — 1 query ───
    cards = db.execute(
        select(Flashcard.last_reviewed_at)
        .join(LearnSession)
        .where(
            LearnSession.user_id == current_user.id,
            Flashcard.last_reviewed_at >= since,
        )
    ).all()

    # ─── 3. Group by day in Python ───
    session_by_day: dict[str, int] = {}
    for row in sessions:
        d = row.created_at.date().isoformat()
        session_by_day[d] = session_by_day.get(d, 0) + 1

    card_by_day: dict[str, int] = {}
    for row in cards:
        if row.last_reviewed_at:
            d = row.last_reviewed_at.date().isoformat()
            card_by_day[d] = card_by_day.get(d, 0) + 1

    # Daily points array
    daily_points = []
    for i in range(days):
        day = (since + timedelta(days=i)).date().isoformat()
        pts = session_by_day.get(day, 0) * 20 + card_by_day.get(day, 0) * 2
        daily_points.append({"date": day, "points": pts})

    # ─── 4. Weekly sessions (last 12 weeks) — Python grouping ───
    all_sessions = db.execute(
        select(LearnSession.created_at)
        .where(LearnSession.user_id == current_user.id)
    ).all()

    weekly = []
    for w in range(11, -1, -1):
        week_start = (now - timedelta(weeks=w + 1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(weeks=1)
        count = sum(
            1 for row in all_sessions
            if week_start <= row.created_at < week_end
        )
        weekly.append({
            "week": week_start.strftime("%b %d"),
            "sessions": count,
        })

    # ─── 5. Subject breakdown — Python grouping ───
    subject_map: dict[str, int] = {}
    for row in sessions:
        if row.subject:
            subject_map[row.subject] = subject_map.get(row.subject, 0) + 1
    subject_breakdown = [
        {"subject": s, "count": c} for s, c in subject_map.items()
    ]

    # ─── 6. Totals — 5 simple count queries ───
    total_sessions = db.execute(
        select(func.count()).select_from(LearnSession)
        .where(LearnSession.user_id == current_user.id)
    ).scalar() or 0

    total_flashcards = db.execute(
        select(func.count()).select_from(Flashcard)
        .join(LearnSession)
        .where(LearnSession.user_id == current_user.id)
    ).scalar() or 0

    total_quizzes = db.execute(
        select(func.count()).select_from(QuizAttempt)
        .join(LearnSession)
        .where(
            LearnSession.user_id == current_user.id,
            QuizAttempt.completed_at.isnot(None),
        )
    ).scalar() or 0

    total_notes = db.execute(
        select(func.count()).select_from(Note)
        .where(Note.user_id == current_user.id)
    ).scalar() or 0

    total_goals = db.execute(
        select(func.count()).select_from(Goal)
        .where(Goal.user_id == current_user.id)
    ).scalar() or 0

    # ─── 7. Heatmap — one query for 365 days, grouped in Python ───
    heatmap_days = 365
    heatmap_start = (now - timedelta(days=heatmap_days - 1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    heatmap_sessions = db.execute(
        select(LearnSession.created_at)
        .where(
            LearnSession.user_id == current_user.id,
            LearnSession.created_at >= heatmap_start,
        )
    ).all()

    heatmap_map: dict[str, int] = {}
    for row in heatmap_sessions:
        d = row.created_at.date().isoformat()
        heatmap_map[d] = heatmap_map.get(d, 0) + 1

    heatmap = []
    for i in range(heatmap_days - 1, -1, -1):
        day = (now - timedelta(days=i)).date()
        heatmap.append({
            "date": day.isoformat(),
            "count": heatmap_map.get(day.isoformat(), 0),
        })

    return {
        "totals": {
            "points": current_user.points or 0,
            "streak_days": current_user.streak_days or 0,
            "sessions": total_sessions,
            "flashcards": total_flashcards,
            "quizzes": total_quizzes,
            "notes": total_notes,
            "goals": total_goals,
        },
        "daily_points": daily_points,
        "weekly_sessions": weekly,
        "subject_breakdown": subject_breakdown,
        "heatmap": heatmap,
    }