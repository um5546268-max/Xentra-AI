import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # "bug" | "feature" | "general" | "praise"
    category: Mapped[str] = mapped_column(String(30), default="general", index=True)

    # 1-5 stars, optional
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Where the user was when they submitted (e.g. "/app/code")
    page_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Browser / device info
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Screenshot data URL or S3 URL (optional)
    screenshot_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # "new" | "reviewing" | "resolved" | "closed"
    status: Mapped[str] = mapped_column(String(30), default="new", index=True)

    # Admin notes
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    user = relationship("User", backref="feedback_items")