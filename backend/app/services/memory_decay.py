"""
Memory decay service.
Reduces importance of memories that haven't been used recently.
Preserves pinned memories and manual memories at importance >= 8.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.memory import Memory


def apply_decay(db: Session, user_id) -> int:
    """
    Apply importance decay to old, unused memories.
    Returns the number of memories affected.

    Rules:
    - Skip: pinned, importance >= 9, source == "manual"
    - Skip: used in the last 30 days
    - If unused > 30 days: -1 importance
    - If unused > 90 days: -2 importance
    - Minimum importance: 1 (never deleted)
    """
    now = datetime.now(timezone.utc)

    stmt = (
        select(Memory)
        .where(Memory.user_id == user_id)
        .where(Memory.active == True)  # noqa: E712
        .where(Memory.pinned == False)  # noqa: E712
        .where(Memory.importance < 9)
        .where(Memory.source != "manual")
    )
    memories = db.execute(stmt).scalars().all()

    changed = 0
    for m in memories:
        # Determine last activity
        last_activity = m.last_used_at or m.created_at
        if last_activity.tzinfo is None:
            last_activity = last_activity.replace(tzinfo=timezone.utc)

        days_idle = (now - last_activity).days
        delta = 0

        if days_idle >= 90:
            delta = -2
        elif days_idle >= 30:
            delta = -1

        if delta == 0:
            continue

        new_importance = max(1, m.importance + delta)
        if new_importance != m.importance:
            m.importance = new_importance
            changed += 1

    if changed:
        db.commit()
        print(f"[memory_decay] Adjusted {changed} memory importance scores")

    return changed


def auto_deactivate_unused(db: Session, user_id) -> int:
    """
    Deactivate memories that haven't been used in 180+ days
    AND have fallen to importance 1.
    Preserves pinned, manual, and high-importance memories.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=180)

    stmt = (
        select(Memory)
        .where(Memory.user_id == user_id)
        .where(Memory.active == True)  # noqa: E712
        .where(Memory.pinned == False)  # noqa: E712
        .where(Memory.importance <= 1)
        .where(Memory.source == "auto")
    )
    memories = db.execute(stmt).scalars().all()

    deactivated = 0
    for m in memories:
        last_activity = m.last_used_at or m.created_at
        if last_activity.tzinfo is None:
            last_activity = last_activity.replace(tzinfo=timezone.utc)
        if last_activity < cutoff:
            m.active = False
            deactivated += 1

    if deactivated:
        db.commit()
        print(f"[memory_decay] Deactivated {deactivated} stale memories")

    return deactivated