from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import Request
from fastapi.responses import RedirectResponse
from app.config import settings

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.integration import Integration
from app.schemas.integration import (
    IntegrationRead,
    IntegrationCatalogItem,
    IntegrationCatalogResponse,
)
from app.services.integrations import list_integrations, get_integration

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/catalog", response_model=IntegrationCatalogResponse)
def get_catalog(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    connected_providers = set(
        db.execute(
            select(Integration.provider)
            .where(Integration.user_id == current_user.id)
            .where(Integration.status == "connected")
        ).scalars().all()
    )

    items = []
    for i in list_integrations():
        items.append(
            IntegrationCatalogItem(
                **i,
                connected=i["provider"] in connected_providers,
            )
        )
    return IntegrationCatalogResponse(items=items)


@router.get("", response_model=list[IntegrationRead])
def list_user_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Integration)
        .where(Integration.user_id == current_user.id)
        .order_by(Integration.created_at.desc())
    )
    return db.execute(stmt).scalars().all()


@router.delete("/{provider}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(
    provider: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not get_integration(provider):
        raise HTTPException(status_code=404, detail="Unknown provider")

    integration = db.execute(
        select(Integration)
        .where(Integration.user_id == current_user.id)
        .where(Integration.provider == provider)
    ).scalar_one_or_none()

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not connected")

    db.delete(integration)
    db.commit()
    return None
# ============================================================
# Google OAuth
# ============================================================

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google/connect")
def google_connect(current_user: User = Depends(get_current_user)):
    """
    Return the Google OAuth URL for the frontend to redirect to.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    # State is just the user's id (single-user-per-request context).
    # In a production app, use a signed short-lived token instead.
    state = str(current_user.id)

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join([
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ]),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return {"url": auth_url}


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    """
    Google redirects here after the user authorizes.
    Exchanges the code for tokens and stores them.
    """
    import uuid as uuid_lib

    try:
        user_id = uuid_lib.UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=f"Token exchange failed: {token_resp.text}",
        )

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)
    scopes = tokens.get("scope", "")

    # Fetch user info
    async with httpx.AsyncClient() as client:
        info_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    account_email = None
    account_name = None
    if info_resp.status_code == 200:
        info = info_resp.json()
        account_email = info.get("email")
        account_name = info.get("name")

    # Upsert
    existing = db.execute(
        select(Integration)
        .where(Integration.user_id == user.id)
        .where(Integration.provider == "google")
    ).scalar_one_or_none()

    if existing:
        existing.status = "connected"
        existing.access_token = access_token
        existing.refresh_token = refresh_token or existing.refresh_token
        existing.expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        existing.scopes = scopes
        existing.account_email = account_email
        existing.account_name = account_name
    else:
        db.add(Integration(
            user_id=user.id,
            provider="google",
            status="connected",
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            scopes=scopes,
            account_email=account_email,
            account_name=account_name,
        ))

    db.commit()

    # Redirect back to frontend
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/app/integrations?connected=google")


# ============================================================
# Token refresh helper (used by API calls later)
# ============================================================

async def get_valid_google_token(integration: Integration, db: Session) -> str:
    """
    Return a valid access token. Refreshes if expired.
    """
    now = datetime.now(timezone.utc)
    expires_at = integration.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and expires_at > now + timedelta(minutes=2):
        return integration.access_token or ""

    if not integration.refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token — reconnect Google")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": integration.refresh_token,
                "grant_type": "refresh_token",
            },
        )

    if resp.status_code != 200:
        integration.status = "expired"
        db.commit()
        raise HTTPException(status_code=401, detail="Token refresh failed — reconnect Google")

    tokens = resp.json()
    integration.access_token = tokens["access_token"]
    integration.expires_at = now + timedelta(seconds=tokens.get("expires_in", 3600))
    db.commit()

    return integration.access_token