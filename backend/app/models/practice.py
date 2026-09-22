import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PracticeTest(Base):
    __tablename__ = "practice_tests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(300), nullable=False)
    subject = Column(String(40), nullable=True, index=True)
    source_session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("learn_sessions.id", ondelete="SET NULL"),
        nullable=True,
    )

    questions = Column(JSONB, nullable=False)
    duration_minutes = Column(Integer, default=30, nullable=False)
    pass_threshold = Column(Integer, default=70, nullable=False)  # percent

    # Submission
    answers = Column(JSONB, nullable=True)
    score = Column(Integer, nullable=True)
    passed = Column(Boolean, nullable=True)
    started_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    __table_args__ = (Index("ix_practice_user_created", "user_id", "created_at"),)