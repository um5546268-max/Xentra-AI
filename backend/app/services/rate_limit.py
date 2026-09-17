"""
Simple in-memory rate limiter.
Tracks requests per user per minute and per hour.
For production, swap this with Redis.
"""
import time
from collections import defaultdict, deque
from fastapi import HTTPException

from app.config import settings


# user_id → deque of timestamps
_minute_buckets: dict[str, deque] = defaultdict(deque)
_hour_buckets: dict[str, deque] = defaultdict(deque)


def _prune(bucket: deque, window_seconds: int, now: float):
    cutoff = now - window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()


def check_rate_limit(user_id: str):
    """
    Check if user has exceeded rate limits.
    Raises HTTPException(429) if exceeded.
    """
    now = time.time()

    # Minute bucket
    minute_bucket = _minute_buckets[user_id]
    _prune(minute_bucket, 60, now)

    if len(minute_bucket) >= settings.RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {settings.RATE_LIMIT_PER_MINUTE} requests/minute",
        )

    # Hour bucket
    hour_bucket = _hour_buckets[user_id]
    _prune(hour_bucket, 3600, now)

    if len(hour_bucket) >= settings.RATE_LIMIT_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {settings.RATE_LIMIT_PER_HOUR} requests/hour",
        )

    # Record this request
    minute_bucket.append(now)
    hour_bucket.append(now)


def get_usage(user_id: str) -> dict:
    """Return current usage stats for a user."""
    now = time.time()
    minute_bucket = _minute_buckets[user_id]
    hour_bucket = _hour_buckets[user_id]
    _prune(minute_bucket, 60, now)
    _prune(hour_bucket, 3600, now)

    return {
        "minute": {
            "used": len(minute_bucket),
            "limit": settings.RATE_LIMIT_PER_MINUTE,
        },
        "hour": {
            "used": len(hour_bucket),
            "limit": settings.RATE_LIMIT_PER_HOUR,
        },
    }