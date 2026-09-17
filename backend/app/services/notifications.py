"""
Notification service — create in-app notifications.
"""
from sqlalchemy.orm import Session
from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id,
    title: str,
    body: str | None = None,
    level: str = "info",
    source: str = "system",
    source_id=None,
    link: str | None = None,
    meta: dict | None = None,
) -> Notification:
    """Create a new in-app notification."""
    notif = Notification(
        user_id=user_id,
        title=title,
        body=body,
        level=level,
        source=source,
        source_id=source_id,
        link=link,
        meta=meta,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif