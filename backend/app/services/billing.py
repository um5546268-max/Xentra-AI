"""
Billing service — plans, subscriptions, usage tracking, limit enforcement.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.usage import UsageRecord
from app.models.user import User


def get_or_create_subscription(db: Session, user_id) -> Subscription:
    """Every user gets a Free subscription on first access."""
    sub = db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    ).scalar_one_or_none()

    if sub:
        return sub

    # Create free subscription
    free_plan = db.execute(
        select(Plan).where(Plan.slug == "free")
    ).scalar_one_or_none()
    if not free_plan:
        raise RuntimeError("Free plan not found. Run seed_plans.py first.")

    sub = Subscription(
        user_id=user_id,
        plan_id=free_plan.id,
        status="active",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def get_user_plan(db: Session, user_id) -> Plan:
    sub = get_or_create_subscription(db, user_id)
    return db.get(Plan, sub.plan_id)


def get_limit(db: Session, user_id, metric: str) -> int:
    """Get the limit for a metric. -1 means unlimited."""
    plan = get_user_plan(db, user_id)
    limits = plan.limits or {}
    return limits.get(metric, -1)


def get_usage_today(db: Session, user_id, metric: str) -> int:
    """Sum usage for a metric today."""
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    result = db.execute(
        select(func.coalesce(func.sum(UsageRecord.amount), 0))
        .where(UsageRecord.user_id == user_id)
        .where(UsageRecord.metric == metric)
        .where(UsageRecord.created_at >= today_start)
    ).scalar_one()
    return int(result)


def record_usage(
    db: Session,
    user_id,
    metric: str,
    amount: int = 1,
    meta: dict | None = None,
) -> None:
    """Record a usage event."""
    db.add(UsageRecord(
        user_id=user_id,
        metric=metric,
        amount=amount,
        meta=meta,
    ))
    db.commit()


def check_limit(
    db: Session,
    user_id,
    metric: str,
    amount_to_add: int = 1,
) -> tuple[bool, int, int]:
    """
    Check if a user can perform an action without exceeding their limit.
    Returns (allowed, current_usage, limit).
    Limit of -1 means unlimited.
    """
    limit = get_limit(db, user_id, metric)

    if limit == -1:
        return (True, 0, -1)

    current = get_usage_today(db, user_id, metric)
    allowed = (current + amount_to_add) <= limit

    return (allowed, current, limit)


def check_and_record(
    db: Session,
    user_id,
    metric: str,
    amount: int = 1,
    meta: dict | None = None,
) -> None:
    """
    Check limit and record usage. Raises HTTPException if over limit.
    """
    from fastapi import HTTPException, status

    allowed, current, limit = check_limit(db, user_id, metric, amount)

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Daily limit reached for {metric}: "
                f"{current}/{limit}. Upgrade your plan for more."
            ),
        )

    record_usage(db, user_id, metric, amount, meta)


def get_usage_summary(db: Session, user_id) -> dict:
    """Get today's usage vs limits for all tracked metrics."""
    plan = get_user_plan(db, user_id)
    limits = plan.limits or {}

    summary = {
        "plan": {
            "slug": plan.slug,
            "name": plan.name,
            "price_cents": plan.price_cents,
            "currency": plan.currency,
            "interval": plan.interval,
        },
        "usage": {},
    }

    for metric, limit in limits.items():
        # Map limit keys to usage metric names
        usage_metric = metric.replace("_max", "").replace("_per_day", "")
        current = get_usage_today(db, user_id, usage_metric)
        summary["usage"][metric] = {
            "used": current,
            "limit": limit,
            "remaining": max(0, limit - current) if limit != -1 else -1,
        }

    return summary