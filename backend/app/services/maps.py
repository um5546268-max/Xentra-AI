"""
Google Maps service — Places Search + Directions only.
Geocoding and Distance Matrix require Google Cloud billing; adding them in v2.
"""
import httpx
from fastapi import HTTPException
from app.config import settings


PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"


def _check_key():
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_MAPS_API_KEY not configured",
        )


async def search_places(
    query: str,
    latitude: float | None = None,
    longitude: float | None = None,
    max_results: int = 10,
) -> list[dict]:
    """
    Search for places using Google Places API (New).
    Text Search — converts a natural language query into a list of places.
    """
    _check_key()

    body: dict = {
        "textQuery": query,
        "maxResultCount": min(max_results, 20),
    }

    # Bias results toward user location if provided
    if latitude is not None and longitude is not None:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": latitude, "longitude": longitude},
                "radius": 50000.0,  # 50km
            }
        }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": (
            "places.id,"
            "places.displayName,"
            "places.formattedAddress,"
            "places.location,"
            "places.rating,"
            "places.userRatingCount,"
            "places.priceLevel,"
            "places.types,"
            "places.businessStatus,"
            "places.googleMapsUri,"
            "places.websiteUri,"
            "places.internationalPhoneNumber,"
            "places.currentOpeningHours.openNow"
        ),
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(
            PLACES_SEARCH_URL,
            headers=headers,
            json=body,
            timeout=20,
        )

    if r.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Places API error ({r.status_code}): {r.text[:300]}",
        )

    data = r.json()
    places = data.get("places", [])

    results = []
    for p in places:
        loc = p.get("location") or {}
        results.append({
            "id": p.get("id"),
            "name": p.get("displayName", {}).get("text", ""),
            "address": p.get("formattedAddress", ""),
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
            "rating": p.get("rating"),
            "reviews_count": p.get("userRatingCount"),
            "price_level": p.get("priceLevel"),
            "types": p.get("types", []),
            "business_status": p.get("businessStatus"),
            "open_now": p.get("currentOpeningHours", {}).get("openNow"),
            "maps_url": p.get("googleMapsUri"),
            "website": p.get("websiteUri"),
            "phone": p.get("internationalPhoneNumber"),
        })

    return results


async def get_directions(
    origin: str,
    destination: str,
    mode: str = "driving",
) -> dict | None:
    """
    Get directions between two places.
    mode: driving | walking | bicycling | transit
    """
    _check_key()

    async with httpx.AsyncClient() as client:
        r = await client.get(
            DIRECTIONS_URL,
            params={
                "origin": origin,
                "destination": destination,
                "mode": mode,
                "key": settings.GOOGLE_MAPS_API_KEY,
            },
            timeout=15,
        )

    if r.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Directions error: {r.text[:200]}",
        )

    data = r.json()
    if data.get("status") != "OK" or not data.get("routes"):
        return None

    route = data["routes"][0]
    leg = route["legs"][0]

    return {
        "origin": leg.get("start_address"),
        "destination": leg.get("end_address"),
        "distance": leg.get("distance", {}).get("text"),
        "duration": leg.get("duration", {}).get("text"),
        "steps": [
            {
                "instruction": s.get("html_instructions", ""),
                "distance": s.get("distance", {}).get("text"),
                "duration": s.get("duration", {}).get("text"),
                "mode": s.get("travel_mode"),
            }
            for s in leg.get("steps", [])
        ],
        "polyline": route.get("overview_polyline", {}).get("points"),
        "summary": route.get("summary"),
    }