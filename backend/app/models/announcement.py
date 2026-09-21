import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)

    level: Mapped[str] = mapped_column(String(20), default="info")
    # "info" | "success" | "warning" | "error"

    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    dismissible: Mapped[bool] = mapped_column(Boolean, default=True)

    target: Mapped[str] = mapped_column(String(30), default="all")
    # "all" | "admins" | "specific"

    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )