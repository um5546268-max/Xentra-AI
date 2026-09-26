import uuid
import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, or_, and_, desc, func
from sqlalchemy.orm import Session
from fastapi import UploadFile, File, Form
from pydantic import BaseModel

from app.core import r2 as r2_storage
from app.schemas.connect_chat import UploadResponse
from app.models.chat_block import ChatBlock
from app.services.usage_guard import enforce_limit
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
        # Compute level from points (1000 points = 1 level)
        points = getattr(u, "points", 0) or 0
        level = max(1, points // 1000 + 1)
        streak = getattr(u, "streak_days", 0) or 0
        interests = getattr(u, "interests", None) or []

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
                points=points,
                streak_days=streak,
                level=level,
                interests=list(interests) if isinstance(interests, list) else [],
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
        pinned_at=msg.pinned_at,
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


def _get_blocked_user_ids(user_id: uuid.UUID, db: Session) -> set[uuid.UUID]:
    """Return the set of user_ids this user has blocked."""
    rows = db.execute(
        select(ChatBlock.blocked_id).where(ChatBlock.blocker_id == user_id)
    ).scalars().all()
    return set(rows)


# ═══════════════════════════════════════════════════════════
# BLOCK / UNBLOCK / REPORT
# NOTE: These MUST come before /{chat_id} routes,
# otherwise FastAPI will treat "block" as a chat_id UUID.
# ═══════════════════════════════════════════════════════════
class BlockRequest(BaseModel):
    user_id: uuid.UUID
    reason: str | None = None


@router.post("/block")
def block_user(
    payload: BlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.user_id == current_user.id:
        raise HTTPException(400, "Can't block yourself")

    target = db.get(User, payload.user_id)
    if not target:
        raise HTTPException(404, "User not found")

    existing = db.execute(
        select(ChatBlock).where(
            ChatBlock.blocker_id == current_user.id,
            ChatBlock.blocked_id == payload.user_id,
        )
    ).scalar_one_or_none()

    if existing:
        return {"status": "already_blocked"}

    db.add(ChatBlock(
        blocker_id=current_user.id,
        blocked_id=payload.user_id,
        reason=payload.reason,
    ))
    db.commit()
    return {"status": "blocked"}


@router.post("/unblock")
def unblock_user(
    payload: BlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.execute(
        select(ChatBlock).where(
            ChatBlock.blocker_id == current_user.id,
            ChatBlock.blocked_id == payload.user_id,
        )
    ).scalar_one_or_none()
    if existing:
        db.delete(existing)
        db.commit()
    return {"status": "unblocked"}


@router.post("/report")
def report_user(
    payload: BlockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, payload.user_id)
    if not target:
        raise HTTPException(404, "User not found")

    from app.models.audit_log import AuditLog
    db.add(AuditLog(
        user_id=current_user.id,
        action="report_user",
        target_type="user",
        target_id=str(payload.user_id),
        details={"reason": payload.reason or ""},
    ))
    db.commit()
    return {"status": "reported"}


@router.get("/blocks/list")
def list_my_blocks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all users I've blocked."""
    rows = db.execute(
        select(ChatBlock).where(ChatBlock.blocker_id == current_user.id)
    ).scalars().all()

    results = []
    for b in rows:
        u = db.get(User, b.blocked_id)
        if not u:
            continue
        results.append({
            "id": str(b.id),
            "user_id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "avatar_url": u.avatar_url,
            "reason": b.reason,
            "blocked_at": b.created_at.isoformat(),
        })
    return results


# ─────────────────────────────────────────────────────────
# Create a chat (direct or group)
# ─────────────────────────────────────────────────────────
@router.post("", response_model=ChatPublic, status_code=201)
def create_chat(
    payload: ChatCreateDirect | ChatCreateGroup,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if isinstance(payload, ChatCreateDirect):
        other = db.get(User, payload.other_user_id)
        if not other:
            raise HTTPException(404, "User not found")
        if other.id == current_user.id:
            raise HTTPException(400, "Can't chat with yourself")

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

        chat = Chat(type="direct", created_by=current_user.id)
        db.add(chat)
        db.flush()

        db.add(ChatMember(chat_id=chat.id, user_id=current_user.id, role="admin"))
        db.add(ChatMember(chat_id=chat.id, user_id=other.id, role="member"))
        db.commit()
        db.refresh(chat)
        return _chat_to_public(chat, db)

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

    db.add(ChatMember(chat_id=chat.id, user_id=current_user.id, role="admin"))

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

    # Filter out messages this user has "deleted for me"
    uid = str(current_user.id)
    filtered = [
        m for m in messages
        if not m.deleted_for or uid not in m.deleted_for
    ]

    # Filter out messages from blocked users
    blocked_ids = _get_blocked_user_ids(current_user.id, db)
    if blocked_ids:
        filtered = [m for m in filtered if m.sender_id not in blocked_ids]

    return [_message_to_public(m, db) for m in reversed(filtered)]


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

    # Prevent DMs between blocked users
    chat_obj = db.get(Chat, chat_id)
    if chat_obj and chat_obj.type == "direct":
        other_member = db.execute(
            select(ChatMember).where(
                ChatMember.chat_id == chat_id,
                ChatMember.user_id != current_user.id,
            )
        ).scalar_one_or_none()
        if other_member:
            blk = db.execute(
                select(ChatBlock).where(
                    or_(
                        and_(
                            ChatBlock.blocker_id == current_user.id,
                            ChatBlock.blocked_id == other_member.user_id,
                        ),
                        and_(
                            ChatBlock.blocker_id == other_member.user_id,
                            ChatBlock.blocked_id == current_user.id,
                        ),
                    )
                )
            ).scalar_one_or_none()
            if blk:
                raise HTTPException(403, "Cannot send — user is blocked")

    # Build meta + extract mentions
    meta = dict(payload.meta or {})
    mention_names = re.findall(r"@([\w\.\-]+)", payload.content)
    if mention_names:
        member_users = []
        for m in db.execute(
            select(ChatMember).where(ChatMember.chat_id == chat_id)
        ).scalars().all():
            u = db.get(User, m.user_id)
            if u:
                member_users.append(u)

        mentioned_ids = []
        for u in member_users:
            first_name = (u.full_name or "").split(" ")[0].lower()
            email_prefix = (u.email or "").split("@")[0].lower()
            for name in mention_names:
                n = name.lower()
                if n == first_name or n == email_prefix:
                    mentioned_ids.append(str(u.id))
                    break

        if mentioned_ids:
            meta["mentions"] = mentioned_ids

    msg = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        type=payload.type,
        content=payload.content,
        meta=meta,
        reply_to_id=payload.reply_to_id,
        forwarded_from_id=payload.forwarded_from_id,
        reactions={},
    )
    db.add(msg)

    if chat_obj:
        chat_obj.last_message_at = datetime.now(timezone.utc)
        preview = (
            payload.content[:120]
            if payload.type == "text"
            else f"[{payload.type}]"
        )
        chat_obj.last_message_preview = preview

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
# Delete a message (soft delete, with me/everyone scope)
# ─────────────────────────────────────────────────────────
@router.delete("/{chat_id}/messages/{message_id}", status_code=204)
def delete_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    scope: str = "everyone",
):
    _require_membership(chat_id, current_user.id, db)
    msg = db.get(ChatMessage, message_id)
    if not msg or msg.chat_id != chat_id:
        raise HTTPException(404, "Message not found")

    if scope == "me":
        current = list(msg.deleted_for or [])
        uid = str(current_user.id)
        if uid not in current:
            current.append(uid)
        msg.deleted_for = current
        db.add(msg)
        db.commit()
        return None

    if msg.sender_id != current_user.id:
        raise HTTPException(403, "Can only delete your own messages for everyone")

    msg.deleted_at = datetime.now(timezone.utc)
    msg.content = ""
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
# Mark chat as read
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
# Typing indicator
# ─────────────────────────────────────────────────────────
_typing_state: dict[str, dict[str, datetime]] = {}
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
        stale = []
        for uid_str, ts in _typing_state[chat_key].items():
            if ts.timestamp() < cutoff:
                stale.append(uid_str)
        for uid_str in stale:
            _typing_state[chat_key].pop(uid_str, None)

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
        results.append(UnreadCount(chat_id=m.chat_id, unread=len(count)))
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
    ct = (content_type or "").lower()
    fn = filename.lower()
    if ct.startswith(IMAGE_MIME_PREFIX):
        return "image"
    if ct.startswith(VIDEO_MIME_PREFIX):
        return "video"
    if ct.startswith(AUDIO_MIME_PREFIX):
        return "voice"
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
    _require_membership(chat_id, current_user.id, db)

    msg_type = _detect_message_type(file.content_type, file.filename or "")

    max_mb = MAX_SIZES_MB.get(msg_type, 25)
    max_bytes = max_mb * 1024 * 1024

    contents = await file.read()
    size = len(contents)
    if size > max_bytes:
        raise HTTPException(
            413, f"File too large. Max for {msg_type}: {max_mb} MB"
        )
    if size == 0:
        raise HTTPException(400, "Empty file")

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

    meta = {
        "name": file.filename,
        "size": size,
        "mime": file.content_type or "application/octet-stream",
        "key": result["key"],
        "url": result["url"],
    }
    if msg_type == "image":
        meta["caption"] = None

    # ✅ This block is now correctly OUTSIDE the image if-statement
    msg = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        type=msg_type,
        content=file.filename or "attachment",
        meta=meta,
        reactions={},
    )
    db.add(msg)

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


# ─────────────────────────────────────────────────────────
# Discover public groups
# ─────────────────────────────────────────────────────────
@router.get("/discover/public", response_model=list[ChatPublic])
def discover_public_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    search: str | None = None,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    my_chat_ids = db.execute(
        select(ChatMember.chat_id).where(ChatMember.user_id == current_user.id)
    ).scalars().all()

    q = select(Chat).where(Chat.is_public == True, Chat.type == "group")

    if my_chat_ids:
        q = q.where(~Chat.id.in_(my_chat_ids))

    if search:
        like = f"%{search.lower()}%"
        q = q.where(
            or_(
                func.lower(Chat.name).like(like),
                func.lower(Chat.description).like(like),
            )
        )
    if category:
        q = q.where(Chat.category == category)

    q = q.order_by(desc(Chat.created_at)).limit(limit).offset(offset)
    chats = db.execute(q).scalars().all()

    return [_chat_to_public(c, db) for c in chats]


# ─────────────────────────────────────────────────────────
# Join a public group
# ─────────────────────────────────────────────────────────
@router.post("/{chat_id}/join", response_model=ChatPublic)
def join_public_group(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = db.get(Chat, chat_id)
    if not chat:
        raise HTTPException(404, "Chat not found")
    if chat.type != "group":
        raise HTTPException(400, "Can only join groups")
    if not chat.is_public:
        raise HTTPException(403, "This group is private")

    existing = db.execute(
        select(ChatMember).where(
            ChatMember.chat_id == chat_id,
            ChatMember.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if existing:
        return _chat_to_public(chat, db)

    db.add(ChatMember(chat_id=chat_id, user_id=current_user.id, role="member"))
    db.commit()
    db.refresh(chat)
    return _chat_to_public(chat, db)


# ─────────────────────────────────────────────────────────
# Ask Xentra — AI assistance inside a chat
# ─────────────────────────────────────────────────────────
from app.services.ai import chat_completion


class AskXentraRequest(BaseModel):
    action: str
    message_id: uuid.UUID | None = None
    prompt: str | None = None
    language: str | None = "English"
    content: str | None = None


class AskXentraPrivateResponse(BaseModel):
    text: str
    action: str


PROMPTS = {
    "summarize": (
        "You are Xentra, an AI assistant inside a group chat. "
        "Summarize the following conversation in 3-5 clear bullet points. "
        "Focus on decisions, questions, and key info. Keep it concise."
    ),
    "explain": (
        "You are Xentra, an AI assistant. "
        "Explain the following message clearly and briefly."
    ),
    "translate": (
        "You are Xentra, an AI assistant. "
        "Translate the following messages into {language}. "
        "Only output the translation, no commentary."
    ),
    "quiz": (
        "You are Xentra, an AI assistant. "
        "Create 3 multiple-choice quiz questions based on the following conversation. "
        "Format: Q1: ... A) ... B) ... C) ... D) ... Answer: X."
    ),
    "action_items": (
        "You are Xentra, an AI assistant. "
        "Extract all actionable items (tasks, to-dos) from the following conversation. "
        "Format as a numbered list."
    ),
}


def _build_prompt(payload: AskXentraRequest, recent: list[ChatMessage], db: Session) -> str:
    def fmt(m: ChatMessage) -> str:
        sender = db.get(User, m.sender_id)
        name = sender.full_name or sender.email if sender else "User"
        return f"{name}: {m.content}"

    context = "\n".join(fmt(m) for m in recent)

    if payload.action == "explain":
        if not payload.message_id:
            raise HTTPException(400, "message_id required for 'explain'")
        target = next((m for m in recent if m.id == payload.message_id), None)
        if not target:
            raise HTTPException(404, "Message not found in recent chat")
        return PROMPTS["explain"] + "\n\nMessage to explain:\n" + fmt(target)

    if payload.action == "translate":
        lang = payload.language or "English"
        return (
            PROMPTS["translate"].format(language=lang)
            + "\n\nMessages to translate:\n"
            + context
        )

    if payload.action == "custom":
        if not payload.prompt or not payload.prompt.strip():
            raise HTTPException(400, "prompt required for 'custom'")
        return (
            "You are Xentra, an AI assistant inside a group chat. "
            "Answer the user's question about this conversation.\n\n"
            f"Conversation:\n{context}\n\n"
            f"User asks: {payload.prompt.strip()}"
        )

    if payload.action in PROMPTS:
        return

    # ─────────────────────────────────────────────────────────
# PRIVATE endpoint — returns AI text, does NOT save
# ─────────────────────────────────────────────────────────
@router.post("/{chat_id}/ask-xentra/private", response_model=AskXentraPrivateResponse)
def ask_xentra_private(
    chat_id: uuid.UUID,
    payload: AskXentraRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _limit: None = Depends(enforce_limit("connect_ai_minutes", amount=1)),
):
    _require_membership(chat_id, current_user.id, db)

    recent = db.execute(
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat_id, ChatMessage.deleted_at.is_(None))
        .order_by(desc(ChatMessage.created_at))
        .limit(20)
    ).scalars().all()
    recent = list(reversed(recent))

    if not recent and payload.action != "custom":
        raise HTTPException(400, "No messages in this chat yet")

    user_prompt = _build_prompt(payload, recent, db)

    try:
        result = chat_completion(
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1024,
            temperature=0.5,
        )
    except Exception as e:
        raise HTTPException(502, f"AI provider error: {e}")

    ai_text = (result.get("content") or "").strip()
    if not ai_text:
        raise HTTPException(502, "AI returned empty response")

    return AskXentraPrivateResponse(text=ai_text, action=payload.action)

# ─────────────────────────────────────────────────────────
# PUBLIC endpoint — saves AI message in chat + handles "share" mode
# ─────────────────────────────────────────────────────────
@router.post("/{chat_id}/ask-xentra", response_model=MessagePublic)
def ask_xentra(
    chat_id: uuid.UUID,
    payload: AskXentraRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)

    # SHARE MODE — user chose to share a private AI response
    if payload.action == "share":
        if not payload.content or not payload.content.strip():
            raise HTTPException(400, "content required for 'share'")
        msg = ChatMessage(
            chat_id=chat_id,
            sender_id=current_user.id,
            type="text",
            content=payload.content.strip(),
            meta={
                "is_ai": True,
                "action": "shared",
                "requested_by": str(current_user.id),
            },
            reactions={},
        )
        db.add(msg)
        chat = db.get(Chat, chat_id)
        if chat:
            chat.last_message_at = datetime.now(timezone.utc)
            chat.last_message_preview = f"🤖 Xentra: {payload.content[:100]}"
        db.commit()
        db.refresh(msg)
        return _message_to_public(msg, db)

    # Normal public AI response
    recent = db.execute(
        select(ChatMessage)
        .where(ChatMessage.chat_id == chat_id, ChatMessage.deleted_at.is_(None))
        .order_by(desc(ChatMessage.created_at))
        .limit(20)
    ).scalars().all()
    recent = list(reversed(recent))

    if not recent and payload.action != "custom":
        raise HTTPException(400, "No messages in this chat yet")

    user_prompt = _build_prompt(payload, recent, db)

    try:
        result = chat_completion(
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1024,
            temperature=0.5,
        )
    except Exception as e:
        raise HTTPException(502, f"AI provider error: {e}")

    ai_text = (result.get("content") or "").strip()
    if not ai_text:
        raise HTTPException(502, "AI returned empty response")

    msg = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        type="text",
        content=ai_text,
        meta={
            "is_ai": True,
            "action": payload.action,
            "requested_by": str(current_user.id),
        },
        reactions={},
    )
    db.add(msg)

    chat = db.get(Chat, chat_id)
    if chat:
        chat.last_message_at = datetime.now(timezone.utc)
        chat.last_message_preview = f"🤖 Xentra: {ai_text[:100]}"

    db.commit()
    db.refresh(msg)

    return _message_to_public(msg, db)

# ═══════════════════════════════════════════════════════════
# PINNED MESSAGES
# ═══════════════════════════════════════════════════════════
@router.post("/{chat_id}/messages/{message_id}/pin", response_model=MessagePublic)
def pin_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)
    msg = db.get(ChatMessage, message_id)
    if not msg or msg.chat_id != chat_id:
        raise HTTPException(404, "Message not found")
    if msg.deleted_at:
        raise HTTPException(400, "Can't pin a deleted message")

    msg.pinned_at = datetime.now(timezone.utc)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _message_to_public(msg, db)


@router.delete("/{chat_id}/messages/{message_id}/pin", response_model=MessagePublic)
def unpin_message(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)
    msg = db.get(ChatMessage, message_id)
    if not msg or msg.chat_id != chat_id:
        raise HTTPException(404, "Message not found")

    msg.pinned_at = None
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _message_to_public(msg, db)


@router.get("/{chat_id}/pinned", response_model=list[MessagePublic])
def list_pinned(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all pinned messages in a chat (newest pin first)."""
    _require_membership(chat_id, current_user.id, db)

    rows = db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.chat_id == chat_id,
            ChatMessage.pinned_at.isnot(None),
            ChatMessage.deleted_at.is_(None),
        )
        .order_by(desc(ChatMessage.pinned_at))
    ).scalars().all()

    return [_message_to_public(m, db) for m in rows]

# ═══════════════════════════════════════════════════════════
# SEARCH MESSAGES
# ═══════════════════════════════════════════════════════════
@router.get("/{chat_id}/search")
def search_messages(
    chat_id: uuid.UUID,
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    _require_membership(chat_id, current_user.id, db)

    query = (q or "").strip()
    if not query:
        return []

    like = f"%{query.lower()}%"
    rows = db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.chat_id == chat_id,
            ChatMessage.deleted_at.is_(None),
            func.lower(ChatMessage.content).like(like),
        )
        .order_by(desc(ChatMessage.created_at))
        .limit(limit)
    ).scalars().all()

    return [_message_to_public(m, db) for m in rows]


# ═══════════════════════════════════════════════════════════
# SHARED MEDIA
# ═══════════════════════════════════════════════════════════
@router.get("/{chat_id}/media", response_model=list[MessagePublic])
def list_media(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    type: str | None = None,
    limit: int = 100,
):
    _require_membership(chat_id, current_user.id, db)

    q = select(ChatMessage).where(
        ChatMessage.chat_id == chat_id,
        ChatMessage.deleted_at.is_(None),
    )
    if type in ("image", "file", "video", "voice"):
        q = q.where(ChatMessage.type == type)
    else:
        q = q.where(ChatMessage.type.in_(["image", "file", "video", "voice"]))

    q = q.order_by(desc(ChatMessage.created_at)).limit(limit)
    rows = db.execute(q).scalars().all()
    return [_message_to_public(m, db) for m in rows]


# ═══════════════════════════════════════════════════════════
# READ RECEIPTS
# ═══════════════════════════════════════════════════════════
class ReadByInfo(BaseModel):
    user_id: uuid.UUID
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    read_at: datetime | None = None


class ReadStatusResponse(BaseModel):
    message_id: uuid.UUID
    total_members: int
    read_count: int
    readers: list[ReadByInfo]


@router.get(
    "/{chat_id}/messages/{message_id}/readers",
    response_model=ReadStatusResponse,
)
def get_message_readers(
    chat_id: uuid.UUID,
    message_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_membership(chat_id, current_user.id, db)
    msg = db.get(ChatMessage, message_id)
    if not msg or msg.chat_id != chat_id:
        raise HTTPException(404, "Message not found")

    members = db.execute(
        select(ChatMember).where(ChatMember.chat_id == chat_id)
    ).scalars().all()

    readers: list[ReadByInfo] = []
    for m in members:
        if m.user_id == msg.sender_id:
            continue
        if m.last_read_at is not None and m.last_read_at >= msg.created_at:
            u = db.get(User, m.user_id)
            if u:
                readers.append(
                    ReadByInfo(
                        user_id=u.id,
                        full_name=u.full_name,
                        email=u.email,
                        avatar_url=u.avatar_url,
                        read_at=m.last_read_at,
                    )
                )

    return ReadStatusResponse(
        message_id=msg.id,
        total_members=len([m for m in members if m.user_id != msg.sender_id]),
        read_count=len(readers),
        readers=readers,
    )