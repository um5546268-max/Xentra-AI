import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ===== Emergency stop =====
    emergency_stop: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    emergency_stop_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    emergency_stop_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ===== Voice =====
    voice_settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ===== Memory decay =====
    last_decay_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ===== Relationships =====
    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    tasks = relationship(
        "Task",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    integrations = relationship(
        "Integration",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    files = relationship(
        "UserFile",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    images = relationship(
        "GeneratedImage",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    memories = relationship(
        "Memory",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    automations = relationship(
        "Automation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    permissions = relationship(
        "Permission",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    audit_logs = relationship(
        "AuditLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    subscription = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    is_admin: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    pending_actions = relationship(
        "PendingAction",
        foreign_keys="PendingAction.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )