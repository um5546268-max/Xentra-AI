import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    # "free" | "pro" | "team" | "enterprise"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Pricing (in cents to avoid floats)
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    interval: Mapped[str] = mapped_column(String(20), default="month")
    # "month" | "year" | "lifetime"

    # External IDs (Stripe / Lemon Squeezy / Paddle)
    external_product_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    external_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Limits (JSONB so we can add new ones without migrations)
    limits: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {
    #   "messages_per_day": 50,
    #   "tasks_per_day": 20,
    #   "images_per_day": 5,
    #   "files_storage_mb": 100,
    #   "automations_max": 2,
    #   "integrations_max": 1,
    #   "voice_minutes_per_day": 5,
    #   "memory_max": 50
    # }

    # Feature flags
    features: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {
    #   "web_search": true,
    #   "browser_agent": true,
    #   "voice": true,
    #   "custom_models": false
    # }

    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )