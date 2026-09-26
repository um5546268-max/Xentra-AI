import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import String, Boolean, Text, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB

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

        # ===== Onboarding =====
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    class_level: Mapped[str | None] = mapped_column(String(40), nullable=True)
    learning_goal: Mapped[str | None] = mapped_column(String(40), nullable=True)
    interests: Mapped[list | None] = mapped_column(JSONB, nullable=True, default=list)
    display_name: Mapped[str | None] = mapped_column(String(60), nullable=True)
    tour_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )

        # ===== Google Sign-In =====
    google_id: Mapped[str | None] = mapped_column(
        String(60), nullable=True, unique=True, index=True
    )
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

        # ===== Gamification =====
    points: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    streak_days: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    last_active_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    pending_actions = relationship(
        "PendingAction",
        foreign_keys="PendingAction.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
        # ===== Plan (derived from subscription) =====
    @hybrid_property
    def plan(self) -> str:
        """Return the current plan slug (lowercase). Defaults to 'free'."""
        sub = getattr(self, "subscription", None)
        if sub is None:
            return "free"

        # Prefer the related Plan object's `slug` field
        plan_obj = getattr(sub, "plan", None)
        if plan_obj is not None:
            slug = getattr(plan_obj, "slug", None)
            if slug:
                return str(slug).lower()

        # Fallback to other possible attributes
        for attr in ("plan_name", "tier"):
            val = getattr(sub, attr, None)
            if isinstance(val, str) and val:
                return val.lower()

        return "free"

        # ===== Connect: friends & chats =====
    friend_requests_sent = relationship(
        "Friendship",
        foreign_keys="Friendship.requester_id",
        back_populates="requester",
        cascade="all, delete-orphan",
    )
    friend_requests_received = relationship(
        "Friendship",
        foreign_keys="Friendship.addressee_id",
        back_populates="addressee",
        cascade="all, delete-orphan",
    )
    chat_memberships = relationship(
        "ChatMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    chat_messages = relationship(
        "ChatMessage",
        back_populates="sender",
        cascade="all, delete-orphan",
    )


