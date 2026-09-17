import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # What happened
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # e.g. "browser.open", "files.delete", "media.play"

    scope: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # "browser" | "files" | "media" | ...

    # Risk level at the time of the action
    tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # "low" | "medium" | "high"

    # Outcome
    status: Mapped[str] = mapped_column(String(20), default="success")
    # "success" | "denied" | "pending" | "failed" | "cancelled"

    # Who/what triggered it
    source: Mapped[str] = mapped_column(String(30), default="user")
    # "user" | "automation" | "task" | "system"

    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    # Details
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Reversibility (for the future Undo feature)
    reversible: Mapped[bool] = mapped_column(default=False)
    undo_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    user = relationship("User", back_populates="audit_logs")