import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Type of memory
    kind: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    # "preference" | "fact" | "project" | "workflow" | "correction" | "note"

    # The memory content itself
    key: Mapped[str] = mapped_column(String(200), nullable=False)
    # Short label, e.g. "preferred language"
    value: Mapped[str] = mapped_column(Text, nullable=False)
    # The actual content, e.g. "Python, never TypeScript"

    # Importance & metadata
    importance: Mapped[int] = mapped_column(Integer, default=5)
    # 1-10, higher = more important, always injected if >= 8

    source: Mapped[str] = mapped_column(String(30), default="manual")
    # "manual" | "auto" | "correction"

    source_conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
    )

    # For deduplication / updates
    normalized_key: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)

    # State
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)

    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="memories")
        # Usage tracking
    use_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )