"""
YouTube Data API v3 wrapper.
No OAuth needed — search uses an API key.
"""
import httpx
from fastapi import HTTPException
from urllib.parse import quote_plus

from app.config import settings


YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


def _check_key():
    if not settings.YOUTUBE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="YOUTUBE_API_KEY not configured",
        )


async def search_videos(
    query: str,
    limit: int = 10,
    order: str = "relevance",
) -> list[dict]:
    """
    Search YouTube for videos.
    order: relevance | date | viewCount | rating
    """
    _check_key()

    async with httpx.AsyncClient() as client:
        r = await client.get(
            YOUTUBE_SEARCH_URL,
            params={
                "key": settings.YOUTUBE_API_KEY,
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": limit,
                "order": order,
            },
            timeout=15,
        )

    if r.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"YouTube error: {r.text[:300]}",
        )

    items = r.json().get("items", [])

    # Fetch statistics in one batch call
    video_ids = [
        i.get("id", {}).get("videoId")
        for i in items
        if i.get("id", {}).get("videoId")
    ]

    stats: dict[str, dict] = {}
    if video_ids:
        async with httpx.AsyncClient() as client:
            r2 = await client.get(
                YOUTUBE_VIDEOS_URL,
                params={
                    "key": settings.YOUTUBE_API_KEY,
                    "part": "statistics,contentDetails",
                    "id": ",".join(video_ids),
                },
                timeout=15,
            )
        if r2.status_code == 200:
            for v in r2.json().get("items", []):
                stats[v["id"]] = {
                    "views": int(v.get("statistics", {}).get("viewCount", 0)),
                    "likes": int(v.get("statistics", {}).get("likeCount", 0)),
                    "duration": v.get("contentDetails", {}).get("duration", ""),
                }

    results = []
    for i in items:
        video_id = i.get("id", {}).get("videoId")
        if not video_id:
            continue
        snippet = i.get("snippet", {})
        s = stats.get(video_id, {})
        results.append({
            "video_id": video_id,
            "title": snippet.get("title"),
            "description": snippet.get("description", "")[:200],
            "channel": snippet.get("channelTitle"),
            "published_at": snippet.get("publishedAt"),
            "thumbnail": (
                snippet.get("thumbnails", {}).get("medium", {}).get("url")
                or snippet.get("thumbnails", {}).get("default", {}).get("url")
            ),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "embed_url": f"https://www.youtube.com/embed/{video_id}",
            "views": s.get("views", 0),
            "likes": s.get("likes", 0),
            "duration": s.get("duration", ""),
        })

    return results


async def get_video(video_id: str) -> dict:
    """Get a single video's details."""
    _check_key()

    async with httpx.AsyncClient() as client:
        r = await client.get(
            YOUTUBE_VIDEOS_URL,
            params={
                "key": settings.YOUTUBE_API_KEY,
                "part": "snippet,statistics,contentDetails",
                "id": video_id,
            },
            timeout=15,
        )

    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"YouTube error: {r.text[:300]}")

    items = r.json().get("items", [])
    if not items:
        raise HTTPException(status_code=404, detail="Video not found")

    v = items[0]
    snippet = v.get("snippet", {})
    return {
        "video_id": video_id,
        "title": snippet.get("title"),
        "description": snippet.get("description", ""),
        "channel": snippet.get("channelTitle"),
        "published_at": snippet.get("publishedAt"),
        "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url"),
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "embed_url": f"https://www.youtube.com/embed/{video_id}",
        "views": int(v.get("statistics", {}).get("viewCount", 0)),
        "likes": int(v.get("statistics", {}).get("likeCount", 0)),
        "duration": v.get("contentDetails", {}).get("duration", ""),
    }