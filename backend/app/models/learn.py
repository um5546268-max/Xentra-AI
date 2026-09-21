import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime,
    ForeignKey, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class LearnSession(Base):
    __tablename__ = "learn_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(300), nullable=False)
    topic = Column(String(300), nullable=True)
    source_type = Column(String(20), nullable=False)
    source_preview = Column(Text, nullable=True)

    summary = Column(Text, nullable=True)
    concepts = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)

    flashcards = relationship("Flashcard", back_populates="session", cascade="all, delete-orphan")
    quizzes = relationship("QuizAttempt", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_learn_sessions_user_created", "user_id", "created_at"),)


class Flashcard(Base):
    __tablename__ = "learn_flashcards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("learn_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    concept = Column(String(200), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    difficulty = Column(String(10), default="medium", nullable=False)

    repetitions = Column(Integer, default=0, nullable=False)
    ease_factor = Column(Float, default=2.5, nullable=False)
    interval_days = Column(Integer, default=0, nullable=False)
    next_review_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)

    times_correct = Column(Integer, default=0, nullable=False)
    times_wrong = Column(Integer, default=0, nullable=False)

    session = relationship("LearnSession", back_populates="flashcards")


class QuizAttempt(Base):
    __tablename__ = "learn_quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("learn_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    questions = Column(JSONB, nullable=False)
    answers = Column(JSONB, nullable=True)
    score = Column(Integer, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)

    session = relationship("LearnSession", back_populates="quizzes")