"""
Xentra gamification — points, streaks, levels.
"""
from datetime import datetime, timezone, date

from sqlalchemy.orm import Session

from app.models.user import User


# ── Point awards for different actions ──
POINTS = {
    "chat": 5,
    "flashcard_review": 2,
    "quiz_complete": 10,
    "learn_session": 20,
    "tool_use": 1,
    "daily_login": 15,
}


def award_points(db: Session, user: User, action: str) -> int:
    """Add points for an action. Returns the points awarded."""
    earned = POINTS.get(action, 0)
    if earned <= 0:
        return 0
    user.points = (user.points or 0) + earned
    db.add(user)
    return earned


def update_streak(db: Session, user: User) -> int:
    """
    Called on each activity. If today's first activity, increment streak.
    Returns the current streak.
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    last = user.last_active_date.date() if user.last_active_date else None

    if last == today:
        # already counted today
        return user.streak_days or 0

    if last is None:
        user.streak_days = 1
    elif (today - last).days == 1:
        user.streak_days = (user.streak_days or 0) + 1
    else:
        # streak broken
        user.streak_days = 1

    user.last_active_date = now
    db.add(user)
    return user.streak_days


def level_from_points(points: int) -> dict:
    """Return level + progress info."""
    level = points // 1000 + 1
    xp_in_level = points % 1000
    return {
        "level": level,
        "xp_in_level": xp_in_level,
        "xp_to_next": 1000,
        "total_points": points,
    }


def record_activity(db: Session, user: User, action: str) -> dict:
    """One-shot: award points + update streak. Call from any route."""
    earned = award_points(db, user, action)
    streak = update_streak(db, user)
    return {
        "points_earned": earned,
        "total_points": user.points,
        "streak_days": streak,
        "level_info": level_from_points(user.points),
    }