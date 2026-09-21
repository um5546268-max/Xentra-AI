"""
Feature flag service.
Flags can be enabled globally, for a % of users, or for specific users.
"""
import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.feature_flag import FeatureFlag


def is_enabled_for(db: Session, key: str, user_id: str | None = None) -> bool:
    """
    Check if a feature flag is enabled for a user.
    Priority: enabled_for_users > global enabled > rollout_percent > false
    """
    flag = db.execute(
        select(FeatureFlag).where(FeatureFlag.key == key)
    ).scalar_one_or_none()

    if not flag:
        return False

    # Specific user override
    if user_id and flag.enabled_for_users:
        user_ids = (flag.enabled_for_users or {}).get("user_ids", [])
        if str(user_id) in user_ids:
            return True

    # Global toggle
    if flag.enabled:
        return True

    # Percentage rollout (deterministic on user_id)
    if flag.rollout_percent > 0 and user_id:
        h = int(hashlib.sha256(str(user_id).encode()).hexdigest(), 16)
        bucket = h % 100
        return bucket < flag.rollout_percent

    return False


def list_flags(db: Session) -> list[FeatureFlag]:
    return db.execute(select(FeatureFlag).order_by(FeatureFlag.key)).scalars().all()


def upsert_flag(
    db: Session,
    key: str,
    enabled: bool | None = None,
    rollout_percent: int | None = None,
    enabled_for_users: dict | None = None,
    description: str | None = None,
) -> FeatureFlag:
    flag = db.execute(
        select(FeatureFlag).where(FeatureFlag.key == key)
    ).scalar_one_or_none()

    if not flag:
        flag = FeatureFlag(key=key)
        db.add(flag)

    if enabled is not None:
        flag.enabled = enabled
    if rollout_percent is not None:
        flag.rollout_percent = max(0, min(100, rollout_percent))
    if enabled_for_users is not None:
        flag.enabled_for_users = enabled_for_users
    if description is not None:
        flag.description = description

    db.commit()
    db.refresh(flag)
    return flag