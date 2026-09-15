from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.spotify import (
    get_profile,
    get_now_playing,
    search_tracks,
    play,
    pause,
    next_track,
    previous_track,
)

router = APIRouter(prefix="/spotify", tags=["spotify"])


class PlayRequest(BaseModel):
    uri: str | None = None


@router.get("/me")
async def me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_profile(db, current_user)


@router.get("/now-playing")
async def now_playing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_now_playing(db, current_user)


@router.get("/search")
async def search(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tracks = await search_tracks(db, current_user, q, limit)
    return {"query": q, "count": len(tracks), "tracks": tracks}


@router.post("/play")
async def play_endpoint(
    payload: PlayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await play(db, current_user, payload.uri)


@router.post("/pause")
async def pause_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await pause(db, current_user)


@router.post("/next")
async def next_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await next_track(db, current_user)


@router.post("/previous")
async def previous_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await previous_track(db, current_user)