import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Text, Float
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


# ── Bee "types" ──────────────────────────────────────────────
BEE_TYPES = [
    "manager",
    "web",
    "computer",
    "coding",
    "file",
    "shopping",
    "maps",
    "media",
    "research",
    "health",
    "video",      
]


class BeeTask(Base):
    """A single unit of work assigned to a Bee."""
    __tablename__ = "bee_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("bee_tasks.id"), nullable=True)

    # Task identity
    bee_type = Column(String(32), nullable=False, index=True)   # web, coding, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Goal DNA (structured intent)
    goal_dna = Column(JSON, nullable=True)          # {product, purpose, budget, ...}
    tool_calls = Column(JSON, nullable=True)        # [{tool, input, output, at}]

    # Progress
    status = Column(String(24), default="queued", index=True)
    # queued | running | paused | verified | failed | stopped | undone
    progress = Column(Integer, default=0)           # 0–100
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)

    # Reality Check
    verified = Column(Boolean, default=False)
    verification = Column(JSON, nullable=True)      # {checked, passed, notes}

    # Emergency stop
    stoppable = Column(Boolean, default=True)
    reversible = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=_utcnow)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    checkpoints = relationship(
        "BeeCheckpoint", back_populates="task", cascade="all, delete-orphan"
    )


class BeeCheckpoint(Base):
    """AI Time Machine — a snapshot before/after an important action."""
    __tablename__ = "bee_checkpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(UUID(as_uuid=True), ForeignKey("bee_tasks.id"), index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)

    label = Column(String(255), nullable=False)     # "Found storage problem"
    kind = Column(String(32), default="info")       # info | action | verify | undo
    payload = Column(JSON, nullable=True)           # state to restore if reversible
    reversible = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), default=_utcnow)

    task = relationship("BeeTask", back_populates="checkpoints")


class BeePermission(Base):
    """Risk-gated actions a Bee may request."""
    __tablename__ = "bee_permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("bee_tasks.id"), nullable=True)

    risk = Column(String(16), nullable=False)       # low | medium | high
    action = Column(String(128), nullable=False)    # "install_software"
    detail = Column(Text, nullable=True)
    status = Column(String(16), default="pending")  # pending | granted | denied
    granted_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow)


# -- Plan ? Bee quota -----------------------------------------
BEE_QUOTA = {
    "free": 2,
    "pro": 5,
    "ultimate": 10,
    "business": 50,
}
