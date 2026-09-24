import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.deps import get_current_user

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserRead
from app.schemas.auth import TokenResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.rate_limit import limiter
from app.schemas.auth import GoogleSignInRequest
from app.services.google_signin import verify_google_id_token
from app.schemas.auth import GitHubSignInRequest          # add to imports
from app.services.github_signin import exchange_github_code
from pydantic import BaseModel
from fastapi import UploadFile, File
from app.core import r2 as r2_storage


router = APIRouter(prefix="/auth", tags=["auth"])


# ── In-memory failure tracking for login throttling ──
_login_failures: dict[str, list[datetime]] = defaultdict(list)


def _record_failure(email: str):
    from app.config import settings
    now = datetime.now(timezone.utc)
    failures = _login_failures[email]
    cutoff = now - timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    failures[:] = [t for t in failures if t > cutoff]
    failures.append(now)


def _is_locked(email: str) -> bool:
    from app.config import settings
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
    failures = [t for t in _login_failures[email] if t > cutoff]
    _login_failures[email] = failures
    return len(failures) >= settings.LOGIN_MAX_FAILURES


def _clear_failures(email: str):
    _login_failures.pop(email, None)


# ── SIGNUP: 3 attempts / hour / IP ──
@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("3/hour")
def signup(
    request: Request,                       # required by slowapi
    response: Response,                     # required by slowapi
    payload: UserCreate,
    db: Session = Depends(get_db),
):
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

    try:
        from app.services.permission_service import ensure_defaults_for_user
        ensure_defaults_for_user(db, user.id)
    except Exception as e:
        print(f"[auth] Failed to create default permissions: {e}")

    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


# ── LOGIN: 10 attempts / 15 min / IP (slowapi) + per-email lockout (in-memory) ──
@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/15minutes")
def login(
    request: Request,                       # required by slowapi
    response: Response,                     # required by slowapi
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    # Per-email lockout (stops distributed brute force on a specific account)
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

    # ── Sign in / sign up with Google ──
@router.post("/google", response_model=TokenResponse)
def google_signin(
    payload: GoogleSignInRequest,
    db: Session = Depends(get_db),
):
    """
    Accept a Google ID token. Verify it. Find or create the user.
    Issue our own JWT (same as email/password flow).
    """
    claims = verify_google_id_token(payload.credential)

    google_id = claims["sub"]
    email = claims["email"].lower().strip()
    name = claims.get("name") or email.split("@")[0]
    picture = claims.get("picture")

    # 1. Look up by google_id first (returning user via Google)
    user = db.execute(
        select(User).where(User.google_id == google_id)
    ).scalar_one_or_none()

    # 2. Fall back to email lookup (auto-link)
    if not user:
        user = db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()

        if user:
            # Existing email/password user → link their Google ID
            user.google_id = google_id
            if not user.full_name:
                user.full_name = name
            if not user.avatar_url:
                user.avatar_url = picture
            db.add(user)
            db.commit()
            db.refresh(user)

    # 3. New user → create account
    if not user:
        # Generate a random password hash they'll never use
        import secrets
        random_pw = secrets.token_urlsafe(32)

        user = User(
            email=email,
            password_hash=hash_password(random_pw),
            full_name=name,
            google_id=google_id,
            avatar_url=picture,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Bootstrap defaults
        try:
            from app.services.permission_service import ensure_defaults_for_user
            ensure_defaults_for_user(db, user.id)
        except Exception as e:
            print(f"[auth.google] Default permissions failed: {e}")

    # 4. Issue our own JWT (same shape as login/signup)
    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))

# ── Sign in / sign up with GitHub ──
@router.post("/github", response_model=TokenResponse)
async def github_signin(
    payload: GitHubSignInRequest,
    db: Session = Depends(get_db),
):
    """
    Accept a GitHub OAuth `code`, exchange for token, fetch profile,
    find or create the user, issue our own JWT.
    """
    gh = await exchange_github_code(payload.code)

    github_id = gh["id"]
    email = gh["email"]
    name = gh["name"] or gh["login"]
    avatar = gh["avatar_url"]

    # 1. Look up by github_id (returning GitHub user)
    user = db.execute(
        select(User).where(User.google_id == f"gh_{github_id}")
    ).scalar_one_or_none()

    # 2. Fall back to email (auto-link)
    if not user:
        user = db.execute(
            select(User).where(User.email == email)
        ).scalar_one_or_none()

        if user:
            user.google_id = f"gh_{github_id}"
            if not user.full_name:
                user.full_name = name
            if not user.avatar_url:
                user.avatar_url = avatar
            db.add(user)
            db.commit()
            db.refresh(user)

    # 3. New user
    if not user:
        import secrets
        random_pw = secrets.token_urlsafe(32)

        user = User(
            email=email,
            password_hash=hash_password(random_pw),
            full_name=name,
            google_id=f"gh_{github_id}",   # reuse the same column, prefixed
            avatar_url=avatar,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        try:
            from app.services.permission_service import ensure_defaults_for_user
            ensure_defaults_for_user(db, user.id)
        except Exception as e:
            print(f"[auth.github] Default permissions failed: {e}")

    # 4. Issue JWT
    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))

# ─────────────────────────────────────────────────────────
# Update profile (avatar)
# ─────────────────────────────────────────────────────────
class UpdateProfileRequest(BaseModel):
    avatar_url: str | None = None
    full_name: str | None = None


@router.patch("/me", response_model=UserRead)
def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip() or None
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url.strip() or None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile picture. Returns the public URL and saves to user profile."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only images are allowed")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 5 MB)")
    if len(contents) == 0:
        raise HTTPException(400, "Empty file")

    from io import BytesIO

    try:
        result = r2_storage.upload_file(
            BytesIO(contents),
            original_filename=file.filename or "avatar.png",
            folder=f"avatars/{current_user.id}",
            content_type=file.content_type,
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")

    # Save directly to user's profile
    current_user.avatar_url = result["url"]
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {"url": result["url"]}