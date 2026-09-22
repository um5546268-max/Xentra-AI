import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(300), nullable=False, default="Untitled")
    body = Column(Text, nullable=False, default="")
    color = Column(String(20), nullable=False, default="default")
    pinned = Column(Boolean, default=False, nullable=False)

    subject = Column(String(40), nullable=True, index=True)
    tags = Column(JSONB, nullable=True, default=list)

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("learn_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    __table_args__ = (Index("ix_notes_user_updated", "user_id", "updated_at"),)