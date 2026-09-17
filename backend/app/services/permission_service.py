"""
Runtime helpers for checking and enforcing permissions.
"""
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.permission import Permission
from app.models.user import User
from app.services.permissions import get_permission, get_default_for


def is_allowed(db: Session, user: User, key: str) -> bool:
    """
    Check if a user has a permission enabled.
    If no row exists, use the default for that tier.
    """
    perm = get_permission(key)
    if not perm:
        # Unknown permission — deny by default (fail closed)
        return False

    row = db.execute(
        select(Permission)
        .where(Permission.user_id == user.id)
        .where(Permission.key == key)
    ).scalar_one_or_none()

    if row:
        return row.enabled

    # No explicit row — use tier default
    return get_default_for(key)


def ensure_defaults_for_user(db: Session, user_id) -> int:
    """
    Create permission rows for all known permissions with defaults.
    Skips any that already exist.
    Returns number created.
    """
    from app.services.permissions import PERMISSIONS

    existing_keys = set(
        db.execute(
            select(Permission.key).where(Permission.user_id == user_id)
        ).scalars().all()
    )

    created = 0
    for key in PERMISSIONS.keys():
        if key in existing_keys:
            continue
        db.add(Permission(
            user_id=user_id,
            key=key,
            enabled=get_default_for(key),
        ))
        created += 1

    if created:
        db.commit()

    return created


def permission_summary(db: Session, user: User) -> dict:
    """Return summary stats for a user's permissions."""
    rows = db.execute(
        select(Permission).where(Permission.user_id == user.id)
    ).scalars().all()

    from app.services.permissions import PERMISSIONS

    by_tier = {"low": {"on": 0, "off": 0}, "medium": {"on": 0, "off": 0}, "high": {"on": 0, "off": 0}}

    for row in rows:
        perm = PERMISSIONS.get(row.key)
        if not perm:
            continue
        tier = perm["tier"]
        if row.enabled:
            by_tier[tier]["on"] += 1
        else:
            by_tier[tier]["off"] += 1

    return {
        "total": len(rows),
        "by_tier": by_tier,
    }