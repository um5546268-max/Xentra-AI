from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.plan_limits import clamp_count
from app.services import youtube as youtube_service


router = APIRouter(prefix="/youtube", tags=["youtube"])


# ═══════════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════════
@router.get("/search", name="youtube_search")
async def search_videos(
    q: str = Query(min_length=1, max_length=200),
    max_results: int = Query(default=25, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """Search YouTube videos, limited by the user's plan."""
    limit = clamp_count(current_user, "youtube_results", max_results)
    results = await youtube_service.search_videos(query=q, limit=limit)
    return {"results": results}


# ═══════════════════════════════════════════════════════════════
# GET SINGLE VIDEO
# ═══════════════════════════════════════════════════════════════
@router.get("/video/{video_id}", name="youtube_get_video")
async def get_video(
    video_id: str,
    current_user: User = Depends(get_current_user),
):
    return await youtube_service.get_video(video_id)