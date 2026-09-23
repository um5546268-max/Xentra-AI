import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Friendship(Base):
    """
    A friendship relationship between two users.
    status:
      - "pending"   → requester sent a request, addressee hasn't accepted yet
      - "accepted"  → both users are friends
      - "blocked"   → addressee (or requester) blocked the other
    Only ONE row exists per pair of users (user_a_id < user_b_id enforced by DB).
    """
    __tablename__ = "friendships"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # Requester = the user who sent the request
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Addressee = the user who received the request
    addressee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    requester = relationship(
        "User",
        foreign_keys=[requester_id],
        back_populates="friend_requests_sent",
    )
    addressee = relationship(
        "User",
        foreign_keys=[addressee_id],
        back_populates="friend_requests_received",
    )

    __table_args__ = (
        CheckConstraint(
            "requester_id <> addressee_id",
            name="ck_friendship_no_self",
        ),
    )