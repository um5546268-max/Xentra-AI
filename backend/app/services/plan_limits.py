"""Plan-based limits per subscription tier."""

PLAN_LIMITS = {
    "free": {
        "shopping_results": 3,
        "youtube_results": 10,
        "spotify_results": 10,
        "media_results": 10,
        "messages_per_day": 20,
        "images_per_day": 5,
    },
    "pro": {
        "shopping_results": 5,
        "youtube_results": 25,
        "spotify_results": 25,
        "media_results": 25,
        "messages_per_day": 500,
        "images_per_day": 100,
    },
    "ultimate": {
        "shopping_results": 10,
        "youtube_results": 50,
        "spotify_results": 50,
        "media_results": 50,
        "messages_per_day": -1,
        "images_per_day": -1,
    },
}


def get_limit(user, key: str) -> int:
    plan = getattr(user, "plan", "free") or "free"
    plan = str(plan).lower()
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]).get(key, 0)


def clamp_count(user, key: str, requested: int) -> int:
    """Clamp a requested count to the plan's max. -1 means unlimited."""
    limit = get_limit(user, key)
    if limit == -1:
        return requested
    return min(requested, limit)