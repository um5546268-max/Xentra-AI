import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ChatMessage(Base):
    """
    A message inside a Chat.
    type:
      - "text"   → plain text in `content`
      - "image"  → content is a URL, extra meta in `meta`
      - "file"   → content is a URL to file, `meta` has name/size
      - "voice"  → content is a URL to audio, `meta` has duration
      - "video"  → content is a URL to video
      - "system" → system message ("User X joined", etc.)
    """
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    chat_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type: Mapped[str] = mapped_column(
        String(20), default="text", nullable=False
    )  # "text" | "image" | "file" | "voice" | "video" | "system"
    content: Mapped[str] = mapped_column(Text, nullable=False)  # text or URL
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # meta examples:
    #   text  → {"mentions": [...]}
    #   image → {"width": 1920, "height": 1080, "caption": "..."}
    #   file  → {"name": "notes.pdf", "size": 2457600, "mime": "application/pdf"}
    #   voice → {"duration": 45, "mime": "audio/webm"}
    #   video → {"duration": 120, "thumbnail_url": "..."}

    # Reply / forward
    reply_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_messages.id", ondelete="SET NULL"),
        nullable=True,
    )
    forwarded_from_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # Edit / delete
    edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Pinned message
    pinned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    # Reactions: {"👍": [user_id1, user_id2], "❤️": [user_id3]}
    reactions: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, default=dict
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # Relationships
    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User", back_populates="chat_messages")
    reply_to = relationship("ChatMessage", remote_side=[id], foreign_keys=[reply_to_id])