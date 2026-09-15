"""
Google API wrapper.
Uses stored integration tokens to call Gmail, Calendar, and user info.
"""
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException

from app.models.user import User
from app.models.integration import Integration


GMAIL_LIST_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
GMAIL_GET_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}"
CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def _get_google_integration(db: Session, user: User) -> Integration:
    integration = db.execute(
        select(Integration)
        .where(Integration.user_id == user.id)
        .where(Integration.provider == "google")
    ).scalar_one_or_none()

    if not integration or integration.status != "connected":
        raise HTTPException(
            status_code=400,
            detail="Google not connected. Connect it first.",
        )
    return integration


async def _get_token(db: Session, user: User) -> str:
    """
    Import the refresh helper lazily to avoid circular imports.
    """
    from app.routes.integrations import get_valid_google_token
    integration = _get_google_integration(db, user)
    return await get_valid_google_token(integration, db)


async def get_profile(db: Session, user: User) -> dict:
    token = await _get_token(db, user)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {token}"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Google error: {r.text}")
    return r.json()


async def list_gmail_messages(db: Session, user: User, max_results: int = 10) -> list[dict]:
    """
    Return recent Gmail messages: id, subject, from, snippet, date.
    """
    token = await _get_token(db, user)

    async with httpx.AsyncClient() as client:
        # Step 1: list message IDs
        list_resp = await client.get(
            GMAIL_LIST_URL,
            headers={"Authorization": f"Bearer {token}"},
            params={"maxResults": max_results, "labelIds": "INBOX"},
        )
        if list_resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Gmail list error: {list_resp.text}",
            )

        messages = list_resp.json().get("messages", [])
        if not messages:
            return []

        # Step 2: fetch metadata for each
        results = []
        for m in messages:
            detail_resp = await client.get(
                GMAIL_GET_URL.format(id=m["id"]),
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "format": "metadata",
                    "metadataHeaders": ["Subject", "From", "Date"],
                },
            )
            if detail_resp.status_code != 200:
                continue

            data = detail_resp.json()
            headers = {
                h["name"]: h["value"]
                for h in data.get("payload", {}).get("headers", [])
            }

            results.append({
                "id": data.get("id"),
                "subject": headers.get("Subject", "(no subject)"),
                "from": headers.get("From", ""),
                "date": headers.get("Date", ""),
                "snippet": data.get("snippet", ""),
            })

        return results


async def list_calendar_events(
    db: Session,
    user: User,
    max_results: int = 10,
) -> list[dict]:
    """
    Return upcoming calendar events on the primary calendar.
    """
    from datetime import datetime, timezone

    token = await _get_token(db, user)
    now_iso = datetime.now(timezone.utc).isoformat()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            CALENDAR_URL,
            headers={"Authorization": f"Bearer {token}"},
            params={
                "maxResults": max_results,
                "orderBy": "startTime",
                "singleEvents": True,
                "timeMin": now_iso,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Calendar error: {resp.text}")

    items = resp.json().get("items", [])
    results = []
    for e in items:
        start = e.get("start", {}).get("dateTime") or e.get("start", {}).get("date")
        results.append({
            "id": e.get("id"),
            "summary": e.get("summary", "(no title)"),
            "start": start,
            "location": e.get("location"),
            "description": (e.get("description") or "")[:200],
        })
    return results