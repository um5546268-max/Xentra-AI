"""
Xentra Daily Briefing — a warm, personalized morning message.
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.user import User
from app.models.learn import LearnSession, Flashcard
from app.services.ai import chat_completion
from app.services.gamification import level_from_points


BRIEFING_SYSTEM = """You are Xentra, the user's AI operating assistant.
Write a warm, brief morning briefing for the user — 2 to 3 short sentences.

Tone: friendly, encouraging, personal. Not corporate. Not bullet-pointed.
Use their name once. Mention 1-2 things from today's data. End with one small nudge.

Return ONLY the briefing text. No greeting markers, no "Dear user", no sign-off."""


def build_briefing(db: Session, user: User) -> dict:
    """Aggregate today's data and generate a briefing."""
    now = datetime.now(timezone.utc)

    # 1. Due flashcards
    due_cards = db.execute(
        select(func.count())
        .select_from(Flashcard)
        .join(LearnSession)
        .where(
            LearnSession.user_id == user.id,
            Flashcard.next_review_at <= now,
        )
    ).scalar() or 0

    # 2. Total sessions
    total_sessions = db.execute(
        select(func.count())
        .select_from(LearnSession)
        .where(LearnSession.user_id == user.id)
    ).scalar() or 0

    # 3. Most recent session (for "continue learning")
    recent = db.execute(
        select(LearnSession)
        .where(LearnSession.user_id == user.id)
        .order_by(LearnSession.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    # 4. Level info
    level_info = level_from_points(user.points or 0)

    # 5. Build the prompt
    first_name = (user.full_name or "there").split(" ")[0]
    parts = [f"User's name: {first_name}."]
    parts.append(f"Points: {user.points or 0}. Streak: {user.streak_days or 0} days. Level {level_info['level']}.")
    if due_cards > 0:
        parts.append(f"Flashcards due today: {due_cards}.")
    if recent:
        parts.append(f"Recently started learning: {recent.title}.")
    if total_sessions > 0:
        parts.append(f"Total learning sessions: {total_sessions}.")

    prompt = "\n".join(parts)

    # 6. Generate the message
    try:
        result = chat_completion(
            messages=[
                {"role": "system", "content": BRIEFING_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            max_tokens=200,
            temperature=0.7,
        )
        content = result.get("content", "").strip() if isinstance(result, dict) else str(result)
        if not content:
            content = f"Good to see you, {first_name}. Let's make today productive."
    except Exception:
        content = f"Good to see you, {first_name}. Let's make today productive."

    return {
        "message": content,
        "generated_at": now.isoformat(),
        "due_flashcards": due_cards,
        "total_sessions": total_sessions,
        "recent_session": (
            {"id": str(recent.id), "title": recent.title}
            if recent else None
        ),
        "points": user.points or 0,
        "streak_days": user.streak_days or 0,
        "level": level_info["level"],
    }