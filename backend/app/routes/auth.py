import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_current_user

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserRead
from app.schemas.auth import TokenResponse
from app.core.security import hash_password, verify_password, create_access_token


router = APIRouter(prefix="/auth", tags=["auth"])


# In-memory failure tracking for login throttling
_login_failures: dict[str, list[datetime]] = defaultdict(list)


def _record_failure(email: str):
    """Record a failed login attempt."""
    from app.config import settings
    now = datetime.now(timezone.utc)
    failures = _login_failures[email]
    cutoff = now - timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    failures[:] = [t for t in failures if t > cutoff]
    failures.append(now)


def _is_locked(email: str) -> bool:
    """Check if account is locked due to too many failures."""
    from app.config import settings
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    failures = [t for t in _login_failures[email] if t > cutoff]
    _login_failures[email] = failures
    return len(failures) >= settings.LOGIN_MAX_FAILURES


def _clear_failures(email: str):
    _login_failures.pop(email, None)


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    # Check email isn't already taken
    existing = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

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

    # Ensure default permissions exist for this user
    try:
        from app.services.permission_service import ensure_defaults_for_user
        ensure_defaults_for_user(db, user.id)
    except Exception as e:
        print(f"[auth] Failed to create default permissions: {e}")

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    # Check lockout
    if _is_locked(payload.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again in a few minutes.",
        )

    user = db.execute(
        select(User).where(User.email == payload.email)
    ).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        _record_failure(payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    _clear_failures(payload.email)

    # Ensure default permissions exist (idempotent)
    try:
        from app.services.permission_service import ensure_defaults_for_user
        ensure_defaults_for_user(db, user.id)
    except Exception as e:
        print(f"[auth] Failed to ensure default permissions: {e}")

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def me(
    current_user: User = Depends(get_current_user),
):
    return current_user