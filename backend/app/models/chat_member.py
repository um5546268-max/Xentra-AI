import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ChatMember(Base):
    """
    Membership of a user in a chat.
    role:
      - "member"     → normal participant
      - "moderator"  → can remove members, mute, etc.
      - "admin"      → full control (delete chat, promote/demote)
    """
    __tablename__ = "chat_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    chat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(20), default="member", nullable=False
    )  # "member" | "moderator" | "admin"

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # Track read receipts — timestamp of when user last read messages in this chat
    last_read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Mute / notification settings
    is_muted: Mapped[bool] = mapped_column(
        default=False, server_default="false", nullable=False
    )

    # Relationships
    chat = relationship("Chat", back_populates="members")
    user = relationship("User", back_populates="chat_memberships")

    __table_args__ = (
        UniqueConstraint("chat_id", "user_id", name="uq_chat_member"),
    )