from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.youtube import search_videos, get_video

router = APIRouter(prefix="/youtube", tags=["youtube"])


@router.get("/search")
async def search(
    q: str = Query(min_length=1, max_length=200),
    limit: int = Query(default=10, ge=1, le=25),
    order: str = Query(default="relevance"),
    current_user: User = Depends(get_current_user),
):
    results = await search_videos(q, limit, order)
    return {"query": q, "count": len(results), "results": results}


@router.get("/video/{video_id}")
async def video(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    return await get_video(video_id)