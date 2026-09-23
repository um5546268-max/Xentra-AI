import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.friendship import Friendship
from app.schemas.friendship import (
    FriendPublic,
    FriendRequestCreate,
    FriendRequestPublic,
)


router = APIRouter(prefix="/friends", tags=["friends"])


# ─────────────────────────────────────────────────────────
# Send a friend request
# ─────────────────────────────────────────────────────────
@router.post("/request", response_model=FriendRequestPublic, status_code=201)
def send_friend_request(
    payload: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Find target user by id OR email
    target: User | None = None
    if payload.user_id:
        target = db.get(User, payload.user_id)
    elif payload.email:
        target = db.execute(
            select(User).where(User.email == payload.email.lower().strip())
        ).scalar_one_or_none()

    if not target:
        raise HTTPException(404, "User not found")
    if target.id == current_user.id:
        raise HTTPException(400, "You can't add yourself")

    # Check if a friendship row already exists in either direction
    existing = db.execute(
        select(Friendship).where(
            or_(
                and_(
                    Friendship.requester_id == current_user.id,
                    Friendship.addressee_id == target.id,
                ),
                and_(
                    Friendship.requester_id == target.id,
                    Friendship.addressee_id == current_user.id,
                ),
            )
        )
    ).scalar_one_or_none()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(400, "You're already friends")
        if existing.status == "pending":
            raise HTTPException(400, "Friend request already pending")
        if existing.status == "blocked":
            raise HTTPException(403, "Can't send request")

    friendship = Friendship(
        requester_id=current_user.id,
        addressee_id=target.id,
        status="pending",
    )
    db.add(friendship)
    db.commit()
    db.refresh(friendship)

    return FriendRequestPublic(
        id=friendship.id,
        requester_id=friendship.requester_id,
        addressee_id=friendship.addressee_id,
        status=friendship.status,
        created_at=friendship.created_at,
        other_user_id=target.id,
        other_user_name=target.full_name,
        other_user_email=target.email,
        other_user_avatar=target.avatar_url,
    )


# ─────────────────────────────────────────────────────────
# List incoming friend requests
# ─────────────────────────────────────────────────────────
@router.get("/requests", response_model=list[FriendRequestPublic])
def list_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(Friendship, User)
        .join(User, User.id == Friendship.requester_id)
        .where(
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        )
        .order_by(Friendship.created_at.desc())
    ).all()

    return [
        FriendRequestPublic(
            id=f.id,
            requester_id=f.requester_id,
            addressee_id=f.addressee_id,
            status=f.status,
            created_at=f.created_at,
            other_user_id=u.id,
            other_user_name=u.full_name,
            other_user_email=u.email,
            other_user_avatar=u.avatar_url,
        )
        for f, u in rows
    ]


# ─────────────────────────────────────────────────────────
# Accept a friend request
# ─────────────────────────────────────────────────────────
@router.post("/accept/{friendship_id}", response_model=FriendRequestPublic)
def accept_request(
    friendship_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    friendship = db.get(Friendship, friendship_id)
    if not friendship:
        raise HTTPException(404, "Request not found")
    if friendship.addressee_id != current_user.id:
        raise HTTPException(403, "Not your request")
    if friendship.status != "pending":
        raise HTTPException(400, "Request is not pending")

    friendship.status = "accepted"
    db.add(friendship)
    db.commit()
    db.refresh(friendship)

    other = db.get(User, friendship.requester_id)
    return FriendRequestPublic(
        id=friendship.id,
        requester_id=friendship.requester_id,
        addressee_id=friendship.addressee_id,
        status=friendship.status,
        created_at=friendship.created_at,
        other_user_id=other.id if other else None,
        other_user_name=other.full_name if other else None,
        other_user_email=other.email if other else None,
        other_user_avatar=other.avatar_url if other else None,
    )


# ─────────────────────────────────────────────────────────
# Decline a friend request
# ─────────────────────────────────────────────────────────
@router.post("/decline/{friendship_id}", status_code=204)
def decline_request(
    friendship_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    friendship = db.get(Friendship, friendship_id)
    if not friendship:
        raise HTTPException(404, "Request not found")
    if friendship.addressee_id != current_user.id:
        raise HTTPException(403, "Not your request")

    db.delete(friendship)
    db.commit()
    return None


# ─────────────────────────────────────────────────────────
# List my friends
# ─────────────────────────────────────────────────────────
@router.get("", response_model=list[FriendPublic])
def list_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Fetch all accepted friendships where I'm either side
    rows = db.execute(
        select(Friendship).where(
            Friendship.status == "accepted",
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            ),
        )
    ).scalars().all()

    out: list[FriendPublic] = []
    for f in rows:
        other_id = (
            f.addressee_id if f.requester_id == current_user.id else f.requester_id
        )
        other = db.get(User, other_id)
        if not other:
            continue
        out.append(
            FriendPublic(
                id=f.id,
                user_id=other.id,
                full_name=other.full_name,
                email=other.email,
                avatar_url=other.avatar_url,
                status=f.status,
                created_at=f.created_at,
            )
        )
    return out