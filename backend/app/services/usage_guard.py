"""
Usage enforcement dependency: enforce_limit("search").
Returns HTTP 402 (Payment Required) with upgrade info if user hit their daily cap.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.plan_limits import get_limit
from app.services.usage_tracker import get_today_count, record_usage


def enforce_limit(metric: str, amount: int = 1):
    """
    Usage:
        @router.post("/search")
        def search(
            _limit: None = Depends(enforce_limit("search")),
            user: User = Depends(get_current_user),
        ): ...
    """
    def checker(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ) -> None:
        plan_slug = (current_user.plan or "free").lower()
        limit = get_limit(plan_slug, metric)

        # Unlimited
        if limit == -1:
            record_usage(db, current_user.id, metric, amount=amount)
            return

        used = get_today_count(db, current_user.id, metric)

        if used + amount > limit:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "limit_reached",
                    "metric": metric,
                    "plan": plan_slug,
                    "limit": limit,
                    "used": used,
                    "upgrade_url": "/app/billing",
                    "message": (
                        f"You've hit your {plan_slug.title()} plan limit "
                        f"({used}/{limit} {metric.replace('_', ' ')} per day). "
                        f"Upgrade for more."
                    ),
                },
            )

        record_usage(db, current_user.id, metric, amount=amount)

    return checker