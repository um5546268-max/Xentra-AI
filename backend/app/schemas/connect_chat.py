import uuid
from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict


# ─────────────────────────────────────────────────────────
# Chat
# ─────────────────────────────────────────────────────────
ChatType = Literal["direct", "group"]
ChatRole = Literal["member", "moderator", "admin"]


class ChatMemberPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    role: ChatRole
    joined_at: datetime
    last_read_at: datetime | None = None

    # user info (populated manually in the route)
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    is_online: bool = False


class ChatPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: ChatType
    name: str | None = None
    description: str | None = None
    category: str | None = None
    is_public: bool = False
    avatar_color: str | None = None
    last_message_at: datetime | None = None
    last_message_preview: str | None = None
    created_at: datetime
    members: list[ChatMemberPublic] = []


class ChatCreateDirect(BaseModel):
    """Create a 1-to-1 chat with another user."""
    other_user_id: uuid.UUID


class ChatCreateGroup(BaseModel):
    """Create a group chat."""
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = Field(None, max_length=500)
    category: str | None = Field(None, max_length=40)
    is_public: bool = False
    member_ids: list[uuid.UUID] = []


# ─────────────────────────────────────────────────────────
# Messages
# ─────────────────────────────────────────────────────────
MessageType = Literal["text", "image", "file", "voice", "video", "system"]


class MessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chat_id: uuid.UUID
    sender_id: uuid.UUID
    type: MessageType
    content: str
    meta: dict[str, Any] | None = None
    reply_to_id: uuid.UUID | None = None
    forwarded_from_id: uuid.UUID | None = None
    reactions: dict[str, list[str]] | None = None
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime

    # sender info (populated in the route)
    sender_name: str | None = None
    sender_avatar: str | None = None


class MessageCreate(BaseModel):
    type: MessageType = "text"
    content: str = Field(..., min_length=1, max_length=10_000)
    meta: dict[str, Any] | None = None
    reply_to_id: uuid.UUID | None = None


class MessageEdit(BaseModel):
    content: str = Field(..., min_length=1, max_length=10_000)


class ReactionToggle(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=8)

class TypingPing(BaseModel):
    """Sent by a user to indicate they're typing."""
    is_typing: bool = True


class TypingStatus(BaseModel):
    """Response: who is currently typing in this chat."""
    typing_user_ids: list[uuid.UUID]
    updated_at: datetime


class ReadReceiptRequest(BaseModel):
    """Mark a chat as read up to a specific time."""
    up_to: datetime | None = None


class UnreadCount(BaseModel):
    chat_id: uuid.UUID
    unread: int

class UploadResponse(BaseModel):
    """Response after uploading a file for a chat."""
    url: str
    key: str
    name: str
    size: int
    mime: str
    type: MessageType  # "image" | "file" | "voice" | "video"
    message_id: uuid.UUID | None = None  # set if a message was auto-created