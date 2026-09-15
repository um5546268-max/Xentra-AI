"""
Spotify API wrapper.
"""
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException

from app.models.user import User
from app.models.integration import Integration


SPOTIFY_API = "https://api.spotify.com/v1"
SPOTIFY_ME_URL = f"{SPOTIFY_API}/me"
SPOTIFY_CURRENT_URL = f"{SPOTIFY_API}/me/player/currently-playing"
SPOTIFY_DEVICES_URL = f"{SPOTIFY_API}/me/player/devices"
SPOTIFY_PLAY_URL = f"{SPOTIFY_API}/me/player/play"
SPOTIFY_PAUSE_URL = f"{SPOTIFY_API}/me/player/pause"
SPOTIFY_NEXT_URL = f"{SPOTIFY_API}/me/player/next"
SPOTIFY_PREVIOUS_URL = f"{SPOTIFY_API}/me/player/previous"
SPOTIFY_SEARCH_URL = f"{SPOTIFY_API}/search"


def _get_integration(db: Session, user: User) -> Integration:
    integration = db.execute(
        select(Integration)
        .where(Integration.user_id == user.id)
        .where(Integration.provider == "spotify")
    ).scalar_one_or_none()

    if not integration or integration.status != "connected":
        raise HTTPException(
            status_code=400,
            detail="Spotify not connected. Connect it first.",
        )
    return integration


async def _token(db: Session, user: User) -> str:
    from app.routes.integrations import get_valid_spotify_token
    integration = _get_integration(db, user)
    return await get_valid_spotify_token(integration, db)


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def get_profile(db: Session, user: User) -> dict:
    token = await _token(db, user)
    async with httpx.AsyncClient() as client:
        r = await client.get(SPOTIFY_ME_URL, headers=_headers(token))
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Spotify error: {r.text}")
    data = r.json()
    return {
        "id": data.get("id"),
        "display_name": data.get("display_name"),
        "email": data.get("email"),
        "product": data.get("product"),  # "premium" | "free"
        "followers": data.get("followers", {}).get("total"),
        "image": (data.get("images") or [{}])[0].get("url"),
        "country": data.get("country"),
    }


async def get_now_playing(db: Session, user: User) -> dict:
    token = await _token(db, user)

    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(SPOTIFY_CURRENT_URL, headers=_headers(token))
    except Exception:
        return {"playing": False, "track": None, "progress_ms": 0}

    # 204 = nothing playing
    if r.status_code == 204:
        return {"playing": False, "track": None, "progress_ms": 0}

    # Some Spotify errors (no active device, etc.) also mean "nothing playing"
    if r.status_code in (404, 403):
        return {"playing": False, "track": None, "progress_ms": 0}

    if r.status_code != 200:
        # Any other error → return empty state instead of crashing
        return {"playing": False, "track": None, "progress_ms": 0}

    data = r.json()
    item = data.get("item") or {}

    return {
        "playing": data.get("is_playing", False),
        "progress_ms": data.get("progress_ms", 0),
        "track": {
            "id": item.get("id"),
            "name": item.get("name"),
            "artist": ", ".join(a.get("name", "") for a in item.get("artists", [])),
            "album": item.get("album", {}).get("name"),
            "duration_ms": item.get("duration_ms", 0),
            "image": (item.get("album", {}).get("images") or [{}])[0].get("url"),
            "url": item.get("external_urls", {}).get("spotify"),
        } if item else None,
    }


async def search_tracks(db: Session, user: User, query: str, limit: int = 10) -> list[dict]:
    token = await _token(db, user)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            SPOTIFY_SEARCH_URL,
            headers=_headers(token),
            params={"q": query, "type": "track", "limit": limit},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Spotify error: {r.text}")

    items = r.json().get("tracks", {}).get("items", [])
    return [
        {
            "id": t.get("id"),
            "name": t.get("name"),
            "artist": ", ".join(a.get("name", "") for a in t.get("artists", [])),
            "album": t.get("album", {}).get("name"),
            "duration_ms": t.get("duration_ms", 0),
            "image": (t.get("album", {}).get("images") or [{}])[0].get("url"),
            "url": t.get("external_urls", {}).get("spotify"),
            "uri": t.get("uri"),
        }
        for t in items
    ]


async def play(db: Session, user: User, uri: str | None = None) -> dict:
    """
    Start or resume playback. If uri is provided, plays that track.
    Requires Premium.
    """
    token = await _token(db, user)
    body: dict = {}
    if uri:
        body["uris"] = [uri]

    async with httpx.AsyncClient() as client:
        r = await client.put(
            SPOTIFY_PLAY_URL,
            headers={**_headers(token), "Content-Type": "application/json"},
            json=body if body else None,
        )

    if r.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="Spotify Premium required to control playback.",
        )
    if r.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail="No active Spotify device. Open Spotify on your phone/desktop first.",
        )
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail=f"Spotify error: {r.text}")

    return {"ok": True, "action": "play"}


async def pause(db: Session, user: User) -> dict:
    token = await _token(db, user)
    async with httpx.AsyncClient() as client:
        r = await client.put(SPOTIFY_PAUSE_URL, headers=_headers(token))

    if r.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="Spotify Premium required to control playback.",
        )
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail=f"Spotify error: {r.text}")

    return {"ok": True, "action": "pause"}


async def next_track(db: Session, user: User) -> dict:
    token = await _token(db, user)
    async with httpx.AsyncClient() as client:
        r = await client.post(SPOTIFY_NEXT_URL, headers=_headers(token))

    if r.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="Spotify Premium required to control playback.",
        )
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail=f"Spotify error: {r.text}")

    return {"ok": True, "action": "next"}


async def previous_track(db: Session, user: User) -> dict:
    token = await _token(db, user)
    async with httpx.AsyncClient() as client:
        r = await client.post(SPOTIFY_PREVIOUS_URL, headers=_headers(token))

    if r.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="Spotify Premium required to control playback.",
        )
    if r.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail=f"Spotify error: {r.text}")

    return {"ok": True, "action": "previous"}