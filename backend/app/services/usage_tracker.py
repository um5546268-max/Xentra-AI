"""
Daily usage counter backed by the UsageRecord table.
- Counts usage per user per metric within the current UTC day.
- Records new usage events.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.usage import UsageRecord


def _today_window() -> tuple[datetime, datetime]:
    """Return (start_of_day, start_of_tomorrow) in UTC."""
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    # day after
    from datetime import timedelta
    end = start + timedelta(days=1)
    return start, end


def get_today_count(db: Session, user_id: uuid.UUID, metric: str) -> int:
    """Sum of amounts for this metric today."""
    start, end = _today_window()
    total = db.execute(
        select(func.coalesce(func.sum(UsageRecord.amount), 0))
        .where(UsageRecord.user_id == user_id)
        .where(UsageRecord.metric == metric)
        .where(UsageRecord.created_at >= start)
        .where(UsageRecord.created_at < end)
    ).scalar()
    return int(total or 0)


def record_usage(
    db: Session,
    user_id: uuid.UUID,
    metric: str,
    amount: int = 1,
    meta: dict | None = None,
) -> UsageRecord:
    """Log a usage event."""
    record = UsageRecord(
        user_id=user_id,
        metric=metric,
        amount=amount,
        meta=meta,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record