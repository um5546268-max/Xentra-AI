from fastapi import APIRouter, Depends, Query, HTTPException

from app.deps import get_current_user
from app.models.user import User
from app.schemas.maps import (
    MapsSearchResponse,
    DirectionsRequest,
)
from app.services.maps import search_places, get_directions

router = APIRouter(prefix="/maps", tags=["maps"])


@router.get("/search", response_model=MapsSearchResponse)
async def maps_search(
    q: str = Query(min_length=2, max_length=200),
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    limit: int = Query(default=10, ge=1, le=20),
    current_user: User = Depends(get_current_user),
):
    """Search for places by text query."""
    results = await search_places(q, lat, lng, limit)
    return MapsSearchResponse(query=q, count=len(results), results=results)


@router.post("/directions")
async def maps_directions(
    payload: DirectionsRequest,
    current_user: User = Depends(get_current_user),
):
    """Get directions between two places."""
    result = await get_directions(
        payload.origin, payload.destination, payload.mode
    )
    if not result:
        raise HTTPException(status_code=404, detail="No route found")
    return result