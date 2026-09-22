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
    Return aggregated stats for the last N days.
    """
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    # ─── 1. Daily points (approximate — from user's total, but we don't
    #         have per-day points. We'll estimate from activity count) ───
    daily: dict[str, int] = {}
    for i in range(days):
        day = (since + timedelta(days=i)).date().isoformat()
        daily[day] = 0

    # Sum activity by day (sessions + flashcards + quizzes created)
    sessions_by_day = db.execute(
        select(
            func.date(LearnSession.created_at).label("d"),
            func.count().label("c"),
        )
        .where(
            LearnSession.user_id == current_user.id,
            LearnSession.created_at >= since,
        )
        .group_by(func.date(LearnSession.created_at))
    ).all()

    for row in sessions_by_day:
        d = row.d.isoformat() if hasattr(row.d, "isoformat") else str(row.d)
        if d in daily:
            daily[d] += row.c * 20  # 20 points per session

    # ─── 2. Cards reviewed per day (approximate from flashcard review times) ───
    # We only track last_reviewed_at, so count cards reviewed each day
    cards_by_day = db.execute(
        select(
            func.date(Flashcard.last_reviewed_at).label("d"),
            func.count().label("c"),
        )
        .join(LearnSession)
        .where(
            LearnSession.user_id == current_user.id,
            Flashcard.last_reviewed_at >= since,
        )
        .group_by(func.date(Flashcard.last_reviewed_at))
    ).all()

    for row in cards_by_day:
        d = row.d.isoformat() if hasattr(row.d, "isoformat") else str(row.d)
        if d in daily:
            daily[d] += row.c * 2  # 2 points per review

    # ─── 3. Sessions per week (last 12 weeks) ───
    weekly = []
    for w in range(11, -1, -1):
        week_start = (now - timedelta(weeks=w + 1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(weeks=1)
        count = db.execute(
            select(func.count())
            .select_from(LearnSession)
            .where(
                LearnSession.user_id == current_user.id,
                LearnSession.created_at >= week_start,
                LearnSession.created_at < week_end,
            )
        ).scalar() or 0
        weekly.append({
            "week": week_start.strftime("%b %d"),
            "sessions": count,
        })

    # ─── 4. Subject breakdown ───
    subjects_query = db.execute(
        select(
            LearnSession.subject,
            func.count().label("c"),
        )
        .where(LearnSession.user_id == current_user.id)
        .group_by(LearnSession.subject)
    ).all()

    subject_breakdown = []
    for row in subjects_query:
        if row.subject:  # skip null subjects
            subject_breakdown.append({
                "subject": row.subject,
                "count": row.c,
            })

    # ─── 5. Totals ───
    total_sessions = db.execute(
        select(func.count())
        .select_from(LearnSession)
        .where(LearnSession.user_id == current_user.id)
    ).scalar() or 0

    total_flashcards = db.execute(
        select(func.count())
        .select_from(Flashcard)
        .join(LearnSession)
        .where(LearnSession.user_id == current_user.id)
    ).scalar() or 0

    total_quizzes = db.execute(
        select(func.count())
        .select_from(QuizAttempt)
        .join(LearnSession)
        .where(
            LearnSession.user_id == current_user.id,
            QuizAttempt.completed_at.isnot(None),
        )
    ).scalar() or 0

    total_notes = db.execute(
        select(func.count())
        .select_from(Note)
        .where(Note.user_id == current_user.id)
    ).scalar() or 0

    total_goals = db.execute(
        select(func.count())
        .select_from(Goal)
        .where(Goal.user_id == current_user.id)
    ).scalar() or 0

    # ─── 6. Daily heatmap data (365 days for GitHub-style grid) ───
    heatmap_days = 365
    heatmap: list[dict] = []
    for i in range(heatmap_days - 1, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_str = day.isoformat()
        # Count activity that day (approximate from sessions)
        count = db.execute(
            select(func.count())
            .select_from(LearnSession)
            .where(
                LearnSession.user_id == current_user.id,
                func.date(LearnSession.created_at) == day,
            )
        ).scalar() or 0
        heatmap.append({"date": day_str, "count": count})

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
        "daily_points": [{"date": d, "points": p} for d, p in daily.items()],
        "weekly_sessions": weekly,
        "subject_breakdown": subject_breakdown,
        "heatmap": heatmap,
    }