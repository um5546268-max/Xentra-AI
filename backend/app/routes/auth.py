from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_current_user
from app.models.user import User as UserModel
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserRead
from app.schemas.auth import TokenResponse
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    # Check email isn't already taken
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))
@router.get("/me", response_model=UserRead)
def me(current_user: UserModel = Depends(get_current_user)):
    return current_user
        # Run memory decay if due
    try:
        from app.services.memory_decay import apply_decay, auto_deactivate_unused
        now = datetime.now(timezone.utc)
        last_decay = user.last_decay_at
        if last_decay and last_decay.tzinfo is None:
            last_decay = last_decay.replace(tzinfo=timezone.utc)

        if not last_decay or (now - last_decay) > timedelta(hours=24):
            apply_decay(db, user.id)
            auto_deactivate_unused(db, user.id)
            user.last_decay_at = now
            db.commit()
    except Exception as e:
        print(f"[auth] Decay failed (non-fatal): {e}")