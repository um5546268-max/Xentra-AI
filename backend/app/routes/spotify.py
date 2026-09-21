from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.plan_limits import clamp_count
from app.services import spotify as spotify_service
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User


router = APIRouter(prefix="/spotify", tags=["spotify"])


# ═══════════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════════
@router.get("/search", name="spotify_search")
def search_tracks(
    q: str = Query(min_length=1, max_length=200),
    max_results: int = Query(default=25, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """Search Spotify tracks, limited by the user's plan."""
    limit = clamp_count(current_user, "spotify_results", max_results)
    results = spotify_service.search_tracks(q, limit=limit)
    return {"results": results}


# ═══════════════════════════════════════════════════════════════
# NOW PLAYING
# ═══════════════════════════════════════════════════════════════
@router.get("/now-playing", name="spotify_now_playing")
def now_playing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the currently playing track on the user's Spotify device."""
    data = spotify_service.get_now_playing(db, current_user)
    return data


# ═══════════════════════════════════════════════════════════════
# PLAYBACK CONTROLS
# ═══════════════════════════════════════════════════════════════
class PlayRequest(BaseModel):
    uri: str | None = None


@router.post("/play", name="spotify_play")
def play(
    payload: PlayRequest | None = None,
    current_user: User = Depends(get_current_user),
):
    spotify_service.play(uri=payload.uri if payload else None)
    return {"ok": True}


@router.post("/pause", name="spotify_pause")
def pause(current_user: User = Depends(get_current_user)):
    spotify_service.pause()
    return {"ok": True}


@router.post("/next", name="spotify_next")
def next_track(current_user: User = Depends(get_current_user)):
    spotify_service.next_track()
    return {"ok": True}


@router.post("/previous", name="spotify_previous")
def previous_track(current_user: User = Depends(get_current_user)):
    spotify_service.previous_track()
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
# PROFILE
# ═══════════════════════════════════════════════════════════════
@router.get("/profile", name="spotify_profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return spotify_service.get_profile()