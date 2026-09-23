import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Chat(Base):
    """
    A chat room. Can be:
      - "direct"  → 1-to-1 between two users
      - "group"   → many users, has a name, category, and privacy
    """
    __tablename__ = "chats"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    type: Mapped[str] = mapped_column(
        String(20), default="direct", nullable=False, index=True
    )  # "direct" | "group"

    # For groups only
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    category: Mapped[str | None] = mapped_column(
        String(40), nullable=True, index=True
    )  # "study" | "programming" | "ai" | "college" | "project" | other
    is_public: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False, index=True
    )
    avatar_color: Mapped[str | None] = mapped_column(String(40), nullable=True)

    # Who created it (for groups, and for auditing direct chats)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Last message preview (denormalised for fast list rendering)
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    last_message_preview: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    members = relationship(
        "ChatMember",
        back_populates="chat",
        cascade="all, delete-orphan",
    )
    messages = relationship(
        "ChatMessage",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )