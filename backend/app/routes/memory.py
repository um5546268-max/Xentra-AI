import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.services.memory_decay import apply_decay, auto_deactivate_unused

from pydantic import BaseModel
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.memory import Memory
from app.schemas.memory import (
    MemoryCreate,
    MemoryUpdate,
    MemoryRead,
    MemoryListResponse,
)

router = APIRouter(prefix="/memory", tags=["memory"])


def _normalize_key(key: str) -> str:
    """Normalize a key for dedup: lowercase, strip non-alphanumeric."""
    return re.sub(r"[^a-z0-9]+", " ", key.lower()).strip()


@router.get("", response_model=MemoryListResponse)
def list_memories(
    kind: str | None = Query(default=None),
    only_active: bool = Query(default=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all memories for the current user."""
    stmt = select(Memory).where(Memory.user_id == current_user.id)

    if kind:
        stmt = stmt.where(Memory.kind == kind)
    if only_active:
        stmt = stmt.where(Memory.active == True)  # noqa: E712

    # Pinned first, then importance, then recent
    stmt = stmt.order_by(
        Memory.pinned.desc(),
        Memory.importance.desc(),
        Memory.updated_at.desc(),
    )

    memories = db.execute(stmt).scalars().all()
    return MemoryListResponse(count=len(memories), memories=memories)


@router.post("", response_model=MemoryRead, status_code=201)
def create_memory(
    payload: MemoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new memory. If a memory with the same key exists, update it."""
    normalized = _normalize_key(payload.key)

    # Check for existing memory with same normalized key
    existing = db.execute(
        select(Memory)
        .where(Memory.user_id == current_user.id)
        .where(Memory.normalized_key == normalized)
        .where(Memory.active == True)  # noqa: E712
    ).scalar_one_or_none()

    if existing:
        # Update
        existing.value = payload.value
        existing.kind = payload.kind
        existing.importance = payload.importance
        existing.pinned = payload.pinned
        db.commit()
        db.refresh(existing)
        return existing

    memory = Memory(
        user_id=current_user.id,
        kind=payload.kind,
        key=payload.key,
        value=payload.value,
        importance=payload.importance,
        pinned=payload.pinned,
        source="manual",
        normalized_key=normalized,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory


@router.get("/{memory_id}", response_model=MemoryRead)
def get_memory(
    memory_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = db.get(Memory, memory_id)
    if not m or m.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Memory not found")
    return m


@router.patch("/{memory_id}", response_model=MemoryRead)
def update_memory(
    memory_id: uuid.UUID,
    payload: MemoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = db.get(Memory, memory_id)
    if not m or m.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Memory not found")

    if payload.key is not None:
        m.key = payload.key
        m.normalized_key = _normalize_key(payload.key)
    if payload.value is not None:
        m.value = payload.value
    if payload.importance is not None:
        m.importance = payload.importance
    if payload.pinned is not None:
        m.pinned = payload.pinned
    if payload.active is not None:
        m.active = payload.active

    db.commit()
    db.refresh(m)
    return m


@router.delete("/{memory_id}", status_code=204)
def delete_memory(
    memory_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = db.get(Memory, memory_id)
    if not m or m.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(m)
    db.commit()
    return None


@router.delete("", status_code=204)
def delete_all_memories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """DANGER: delete all memories for the current user."""
    db.query(Memory).filter(Memory.user_id == current_user.id).delete()
    db.commit()
    return None
@router.post("/decay")
def trigger_decay(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually trigger memory decay for the current user.
    Normally runs automatically once per day.
    """
    adjusted = apply_decay(db, current_user.id)
    deactivated = auto_deactivate_unused(db, current_user.id)
    return {
        "adjusted": adjusted,
        "deactivated": deactivated,
    }


@router.post("/{memory_id}/touch")
def touch_memory(
    memory_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Record that a memory was used. Bumps use_count and last_used_at."""
    from datetime import datetime, timezone

    m = db.get(Memory, memory_id)
    if not m or m.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Memory not found")

    m.use_count = (m.use_count or 0) + 1
    m.last_used_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(m)
    return m
class BulkToggleRequest(BaseModel):
    ids: list[uuid.UUID]
    active: bool


@router.post("/bulk/toggle")
def bulk_toggle(
    payload: BulkToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Activate or deactivate multiple memories at once."""
    if not payload.ids:
        raise HTTPException(status_code=400, detail="No IDs provided")

    updated = db.query(Memory).filter(
        Memory.id.in_(payload.ids),
        Memory.user_id == current_user.id,
    ).update(
        {Memory.active: payload.active},
        synchronize_session=False,
    )
    db.commit()

    return {"updated": updated, "active": payload.active}