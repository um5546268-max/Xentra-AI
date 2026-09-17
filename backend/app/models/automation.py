import uuid
from datetime import datetime
from sqlalchemy import (
    String,
    Integer,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Metadata
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ----- Schedule -----
    schedule_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # "interval" | "daily" | "weekly"

    interval_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # for schedule_type="interval"

    time_of_day: Mapped[str | None] = mapped_column(String(5), nullable=True)
    # "HH:MM" for schedule_type="daily" or "weekly"

    day_of_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # 0=Monday ... 6=Sunday for schedule_type="weekly"

    # ----- Task to run -----
    task_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # "research" | "browser" | "shopping" | "chat" | "generic" ...

    task_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # payload for the task, e.g. {"query": "laptop prices"}

    # ----- State -----
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    last_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    next_run_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    run_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # ----- Error tracking -----
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    consecutive_failures: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="automations")