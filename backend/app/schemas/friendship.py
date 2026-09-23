import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict


FriendshipStatus = Literal["pending", "accepted", "blocked"]


class FriendPublic(BaseModel):
    """Public info about a friend (from the current user's perspective)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID                       # friendship id
    user_id: uuid.UUID                  # the OTHER user's id
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    status: FriendshipStatus
    created_at: datetime


class FriendRequestCreate(BaseModel):
    """Payload to send a friend request."""
    user_id: uuid.UUID | None = None    # by id
    email: str | None = None            # OR by email


class FriendRequestPublic(BaseModel):
    """A pending incoming/outgoing friend request."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    requester_id: uuid.UUID
    addressee_id: uuid.UUID
    status: FriendshipStatus
    created_at: datetime

    # Info about the OTHER user
    other_user_id: uuid.UUID
    other_user_name: str | None = None
    other_user_email: str | None = None
    other_user_avatar: str | None = None