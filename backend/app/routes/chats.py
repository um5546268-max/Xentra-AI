import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.orm import Session
from fastapi import UploadFile, File, Form
from app.core import r2 as r2_storage
from app.schemas.connect_chat import UploadResponse
from pydantic import BaseModel

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.chat import Chat
from app.models.chat_member import ChatMember
from app.models.chat_message import ChatMessage
from app.schemas.connect_chat import (
    ChatPublic,
    ChatMemberPublic,
    ChatCreateDirect,
    ChatCreateGroup,
    MessagePublic,
    MessageCreate,
    MessageEdit,
    ReactionToggle,
    TypingPing,
    TypingStatus,
    ReadReceiptRequest,
    UnreadCount,
)


router = APIRouter(prefix="/chats", tags=["chats"])


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────
def _chat_to_public(chat: Chat, db: Session) -> ChatPublic:
    members = db.execute(
        select(ChatMember).where(ChatMember.chat_id == chat.id)
    ).scalars().all()

    member_list: list[ChatMemberPublic] = []
    for m in members:
        u = db.get(User, m.user_id)
        if not u:
            continue
        member_list.append(
            ChatMemberPublic(
                id=m.id,
                user_id=u.id,
                role=m.role,
                joined_at=m.joined_at,
                last_read_at=m.last_read_at,
                full_name=u.full_name,
                email=u.email,
                avatar_url=u.avatar_url,
            )
        )

    return ChatPublic(
        id=chat.id,
        type=chat.type,
        name=chat.name,
        description=chat.description,
        category=chat.category,
        is_public=chat.is_public,
        avatar_color=chat.avatar_color,
        last_message_at=chat.last_message_at,
        last_message_preview=chat.last_message_preview,
        created_at=chat.created_at,
        members=member_list,
    )


def _message_to_public(msg: ChatMessage, db: Session) -> MessagePublic:
    sender = db.get(User, msg.sender_id)
    return MessagePublic(
        id=msg.id,
        chat_id=msg.chat_id,
        sender_id=msg.sender_id,
        type=msg.type,
        content=msg.content,
        meta=msg.meta,
        reply_to_id=msg.reply_to_id,
        forwarded_from_id=msg.forwarded_from_id,
        reactions=msg.reactions,
        edited_at=msg.edited_at,
        deleted_at=msg.deleted_at,
        created_at=msg.created_at,
        sender_name=sender.full_name if sender else None,
        sender_avatar=sender.avatar_url if sender else None,
    )


def _require_membership(chat_id: uuid.UUID, user_id: uuid.UUID, db: Session) -> ChatMember:
    m = db.execute(
        select(ChatMember).where(
            ChatMember.chat_id == chat_id,
            ChatMember.user_id == user_id,
        )
    ).scalar_one_or_none()
    if not m:
        raise HTTPException(403, "You're not a member of this chat")
    return m


# ─────────────────────────────────────────────────────────
# Create a direct chat
# ─────────────────────────────────────────────────────────
@router.post("", response_model=ChatPublic, status_code=201)
def create_chat(
    payload: ChatCreateDirect | ChatCreateGroup,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Direct chat
    if isinstance(payload, ChatCreateDirect):
        other = db.get(User, payload.other_user_id)
        if not other:
            raise HTTPException(404, "User not found")
        if other.id == current_user.id:
            raise HTTPException(400, "Can't chat with yourself")

        # Check if a direct chat already exists between these two
        my_chats = db.execute(
            select(ChatMember.chat_id).where(ChatMember.user_id == current_user.id)
        ).scalars().all()
        their_chats = db.execute(
            select(ChatMember.chat_id).where(ChatMember.user_id == other.id)
        ).scalars().all()

        shared = set(my_chats) & set(their_chats)
        for cid in shared:
            c = db.get(Chat, cid)
            if c and c.type == "direct":
                return _chat_to_public(c, db)

        # Create new direct chat
        chat = Chat(
            type="direct",
            created_by=current_user.id,
        )
        db.add(chat)
        db.flush()

        db.add(ChatMember(chat_id=chat.id, user_id=current_user.id, role="admin"))
        db.add(ChatMember(chat_id=chat.id, user_id=other.id, role="member"))
        db.commit()
        db.refresh(chat)
        return _chat_to_public(chat, db)

    # Group chat
    chat = Chat(
        type="group",
        name=payload.name,
        description=payload.description,
        category=payload.category,
        is_public=payload.is_public,
        created_by=current_user.id,
    )
    db.add(chat)
    db.flush()

    # Creator is admin
    db.add(ChatMember(chat_id=chat.id, user_id=current_user.id, role="admin"))

    # Add members (dedup + skip creator)
    seen = {current_user.id}
    for uid in payload.member_ids:
        if uid in seen:
            continue
        u = db.get(User, uid)
        if not u:
            continue
        db.add(ChatMember(chat_id=chat.id, user_id=uid, role="member"))
        seen.add(uid)

    db.commit()
    db.refresh(chat)
    return _chat_to_public(chat, db)


# ─────────────────────────────────────────────────────────
# List my chats
# ─────────────────────────────────────────────────────────
@router.get("", response_model=list[ChatPublic])
def list_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    chat_ids = db.execute(
        select(ChatMember.chat_id).where(ChatMember.user_id == current_user.id)
    ).scalars().all()

    if not chat_ids:
        return []

    chats = db.execute(
        select(Chat)
        .where(Chat.id.in_(chat_ids))
        .order_by(desc(Chat.last_message_at).nullslast(), desc(Chat.created_at))
        .limit(limit)
        .offset(offset)
    ).scalars().all()

    return [_chat_to_public(c, db) for c in chats]


# ─────────────────────────────────────────────────────────
# Get a single chat
# ─────────────────────────────────────────────────────────
@router.get("/{chat_id}", response_model=ChatPublic)
def get_chat(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)
    chat = db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(404, "Chat not found")
    return _chat_to_public(chat, db)


# ─────────────────────────────────────────────────────────
# List messages in a chat
# ─────────────────────────────────────────────────────────
@router.get("/{chat_id}/messages", response_model=list[MessagePublic])
def list_messages(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    before: datetime | None = Query(None),
):
    _require_membership(chat_id, current_user.id, db)

    q = select(ChatMessage).where(ChatMessage.chat_id == chat_id)
    if before:
        q = q.where(ChatMessage.created_at < before)
    q = q.order_by(desc(ChatMessage.created_at)).limit(limit)

    messages = db.execute(q).scalars().all()
    # return oldest-first for rendering
    return [_message_to_public(m, db) for m in reversed(messages)]


# ─────────────────────────────────────────────────────────
# Send a message
# ─────────────────────────────────────────────────────────
@router.post("/{chat_id}/messages", response_model=MessagePublic, status_code=201)
def send_message(
    chat_id: uuid.UUID,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)

    msg = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        type=payload.type,
        content=payload.content,
        meta=payload.meta,
        reply_to_id=payload.reply_to_id,
        reactions={},
    )
    db.add(msg)

    # Update chat preview
    chat = db.get(Chat, chat_id)
    if chat:
        chat.last_message_at = datetime.now(timezone.utc)
        preview = payload.content[:120] if payload.type == "text" else f"[{payload.type}]"
        chat.last_message_preview = preview

    db.commit()
    db.refresh(msg)
    return _message_to_public(msg, db)


# ─────────────────────────────────────────────────────────
# Edit a message
# ─────────────────────────────────────────────────────────
@router.patch("/{chat_id}/messages/{message_id}", response_model=MessagePublic)
def edit_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: MessageEdit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)
    msg = db.get(ChatMessage, message_id)
    if not msg or msg.chat_id != chat_id:
        raise HTTPException(404, "Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(403, "Can only edit your own messages")

    msg.content = payload.content
    msg.edited_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _message_to_public(msg, db)


# ─────────────────────────────────────────────────────────
# Delete a message (soft delete)
# ─────────────────────────────────────────────────────────
@router.delete("/{chat_id}/messages/{message_id}", status_code=204)
def delete_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)
    msg = db.get(ChatMessage, message_id)
    if not msg or msg.chat_id != chat_id:
        raise HTTPException(404, "Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(403, "Can only delete your own messages")

    msg.deleted_at = datetime.now(timezone.utc)
    msg.content = ""  # clear content
    db.add(msg)
    db.commit()
    return None


# ─────────────────────────────────────────────────────────
# Toggle a reaction
# ─────────────────────────────────────────────────────────
@router.post("/{chat_id}/messages/{message_id}/react", response_model=MessagePublic)
def toggle_reaction(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    payload: ReactionToggle,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)
    msg = db.get(ChatMessage, message_id)
    if not msg or msg.chat_id != chat_id:
        raise HTTPException(404, "Message not found")

    reactions = dict(msg.reactions or {})
    users = list(reactions.get(payload.emoji, []))
    uid = str(current_user.id)

    if uid in users:
        users.remove(uid)
    else:
        users.append(uid)

    if users:
        reactions[payload.emoji] = users
    else:
        reactions.pop(payload.emoji, None)

    msg.reactions = reactions
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _message_to_public(msg, db)

# ─────────────────────────────────────────────────────────
# Mark chat as read (updates last_read_at for current user)
# ─────────────────────────────────────────────────────────
@router.post("/{chat_id}/read", status_code=204)
def mark_as_read(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = _require_membership(chat_id, current_user.id, db)
    member.last_read_at = datetime.now(timezone.utc)
    db.add(member)
    db.commit()
    return None


# ─────────────────────────────────────────────────────────
# Typing indicator (in-memory, per-process)
# ─────────────────────────────────────────────────────────
# NOTE: This is a simple in-memory map. For multi-worker production
# you'd use Redis. For a single-worker setup, this works perfectly.
_typing_state: dict[str, dict[str, datetime]] = {}
# structure: { chat_id: { user_id: last_ping_iso } }
TYPING_TTL_SECONDS = 5


@router.post("/{chat_id}/typing", status_code=204)
def send_typing(
    chat_id: uuid.UUID,
    payload: TypingPing,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)

    chat_key = str(chat_id)
    user_key = str(current_user.id)

    if chat_key not in _typing_state:
        _typing_state[chat_key] = {}

    if payload.is_typing:
        _typing_state[chat_key][user_key] = datetime.now(timezone.utc)
    else:
        _typing_state[chat_key].pop(user_key, None)

    return None


@router.get("/{chat_id}/typing", response_model=TypingStatus)
def get_typing(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)

    chat_key = str(chat_id)
    now = datetime.now(timezone.utc)
    cutoff = now.timestamp() - TYPING_TTL_SECONDS

    typing_users: list[uuid.UUID] = []
    if chat_key in _typing_state:
        # Purge stale entries
        stale = []
        for uid_str, ts in _typing_state[chat_key].items():
            if ts.timestamp() < cutoff:
                stale.append(uid_str)
        for uid_str in stale:
            _typing_state[chat_key].pop(uid_str, None)

        # Return everyone except the current user
        for uid_str in _typing_state[chat_key].keys():
            if uid_str != str(current_user.id):
                try:
                    typing_users.append(uuid.UUID(uid_str))
                except ValueError:
                    pass

    return TypingStatus(
        typing_user_ids=typing_users,
        updated_at=now,
    )


# ─────────────────────────────────────────────────────────
# Per-chat unread counts
# ─────────────────────────────────────────────────────────
@router.get("/unread/summary", response_model=list[UnreadCount])
def unread_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return unread counts per chat for the current user.
    An unread message is one that:
      - was created after the user's last_read_at (or all, if null)
      - wasn't sent by the current user
      - hasn't been deleted
    """
    my_memberships = db.execute(
        select(ChatMember).where(ChatMember.user_id == current_user.id)
    ).scalars().all()

    results: list[UnreadCount] = []
    for m in my_memberships:
        q = select(ChatMessage).where(
            ChatMessage.chat_id == m.chat_id,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.deleted_at.is_(None),
        )
        if m.last_read_at is not None:
            q = q.where(ChatMessage.created_at > m.last_read_at)
        count = db.execute(q).scalars().all()
        results.append(
            UnreadCount(chat_id=m.chat_id, unread=len(count))
        )
    return results

# ─────────────────────────────────────────────────────────
# Upload constants
# ─────────────────────────────────────────────────────────
MAX_SIZES_MB = {
    "image": 5,
    "file": 25,
    "voice": 5,
    "video": 100,
}
IMAGE_MIME_PREFIX = "image/"
VIDEO_MIME_PREFIX = "video/"
AUDIO_MIME_PREFIX = "audio/"


def _detect_message_type(content_type: str | None, filename: str) -> str:
    """Classify an upload into our message types."""
    ct = (content_type or "").lower()
    fn = filename.lower()
    if ct.startswith(IMAGE_MIME_PREFIX):
        return "image"
    if ct.startswith(VIDEO_MIME_PREFIX):
        return "video"
    if ct.startswith(AUDIO_MIME_PREFIX):
        return "voice"
    # extension fallback
    if fn.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp")):
        return "image"
    if fn.endswith((".mp4", ".webm", ".mov", ".mkv", ".avi")):
        return "video"
    if fn.endswith((".mp3", ".wav", ".ogg", ".m4a", ".webm")):
        return "voice"
    return "file"

# ─────────────────────────────────────────────────────────
# Upload a file/image/voice/video to a chat
# ─────────────────────────────────────────────────────────
@router.post("/{chat_id}/upload", response_model=UploadResponse)
async def upload_to_chat(
    chat_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify membership
    _require_membership(chat_id, current_user.id, db)

    # Detect message type
    msg_type = _detect_message_type(file.content_type, file.filename or "")

    # Check size limit
    max_mb = MAX_SIZES_MB.get(msg_type, 25)
    max_bytes = max_mb * 1024 * 1024

    # Read file into memory (sized check)
    contents = await file.read()
    size = len(contents)
    if size > max_bytes:
        raise HTTPException(
            413,
            f"File too large. Max for {msg_type}: {max_mb} MB",
        )
    if size == 0:
        raise HTTPException(400, "Empty file")

    # Upload to R2
    from io import BytesIO
    try:
        result = r2_storage.upload_file(
            BytesIO(contents),
            original_filename=file.filename or "upload",
            folder=f"chats/{chat_id}",
            content_type=file.content_type,
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")

    # Build meta for the message
    meta = {
        "name": file.filename,
        "size": size,
        "mime": file.content_type or "application/octet-stream",
        "key": result["key"],
        "url": result["url"],
    }
    if msg_type == "image":
        meta["caption"] = None

    # Create the chat message
    msg = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        type=msg_type,
        content=file.filename or "attachment",
        meta=meta,
        reactions={},
    )
    db.add(msg)

    # Update chat preview
    chat = db.get(Chat, chat_id)
    if chat:
        chat.last_message_at = datetime.now(timezone.utc)
        chat.last_message_preview = f"[{msg_type}] {file.filename}"[:120]

    db.commit()
    db.refresh(msg)

    return UploadResponse(
        url=result["url"],
        key=result["key"],
        name=file.filename or "upload",
        size=size,
        mime=file.content_type or "application/octet-stream",
        type=msg_type,  # type: ignore
        message_id=msg.id,
    )

    # ─────────────────────────────────────────────────────────
# Group member management
# ─────────────────────────────────────────────────────────
class AddMemberRequest(BaseModel):
    user_id: uuid.UUID


class UpdateRoleRequest(BaseModel):
    role: str


@router.post("/{chat_id}/members", response_model=ChatPublic)
def add_member(
    chat_id: uuid.UUID,
    payload: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(404, "Chat not found")
    if chat.type != "group":
        raise HTTPException(400, "Can only add members to groups")

    member = _require_membership(chat_id, current_user.id, db)
    if member.role not in ("admin", "moderator"):
        raise HTTPException(403, "Only admins/moderators can add members")

    existing = db.execute(
        select(ChatMember).where(
            ChatMember.chat_id == chat_id,
            ChatMember.user_id == payload.user_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Already a member")

    target = db.get(User, payload.user_id)
    if not target:
        raise HTTPException(404, "User not found")

    db.add(ChatMember(chat_id=chat_id, user_id=payload.user_id, role="member"))
    db.commit()
    db.refresh(chat)
    return _chat_to_public(chat, db)


@router.delete("/{chat_id}/members/{user_id}", status_code=204)
def remove_member(
    chat_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(404, "Chat not found")

    my_membership = _require_membership(chat_id, current_user.id, db)
    target = db.execute(
        select(ChatMember).where(
            ChatMember.chat_id == chat_id,
            ChatMember.user_id == user_id,
        )
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User is not a member")

    if current_user.id != user_id and my_membership.role not in ("admin", "moderator"):
        raise HTTPException(403, "Only admins/moderators can remove members")

    db.delete(target)
    db.commit()
    return None


@router.patch("/{chat_id}/members/{user_id}", response_model=ChatPublic)
def update_member_role(
    chat_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: UpdateRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.role not in ("member", "moderator", "admin"):
        raise HTTPException(400, "Invalid role")

    my_membership = _require_membership(chat_id, current_user.id, db)
    if my_membership.role != "admin":
        raise HTTPException(403, "Only admins can change roles")

    target = db.execute(
        select(ChatMember).where(
            ChatMember.chat_id == chat_id,
            ChatMember.user_id == user_id,
        )
    ).scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User is not a member")

    target.role = payload.role
    db.add(target)
    db.commit()

    chat = db.get(Chat, chat_id)
    return _chat_to_public(chat, db)