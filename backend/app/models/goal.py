import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    target = Column(Integer, nullable=False, default=100)
    current = Column(Integer, nullable=False, default=0)
    unit = Column(String(20), nullable=False, default="%")

    subject = Column(String(40), nullable=True, index=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    completed = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    __table_args__ = (Index("ix_goals_user_created", "user_id", "created_at"),)