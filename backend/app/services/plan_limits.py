"""
Central plan limits.

Every route that cares about "how many results can this user get" or
"how many operations can this user run" reads from here.

ADMINS ARE ALWAYS UNLIMITED.
"""

from typing import Dict, Any
from app.models.user import User


# ─── Quotas per plan ─────────────────────────────────────────────────
# -1 means "unlimited"
PLAN_LIMITS: Dict[str, Dict[str, int]] = {
    "free": {
        "messages":          50,
        "images":            5,
        "file_upload":       3,
        "browser_tasks":     5,
        "automations":       3,
        "ai_coding":         10,
        "learning_minutes":  60,
        "save_memory":       20,
        "shopping":          10,
        "connect_ai_minutes": 30,
        # result caps (used by clamp_count)
        "spotify_results":   10,
        "youtube_results":   10,
        "shopping_results":  10,
    },
    "pro": {
        "messages":          500,
        "images":            100,
        "file_upload":       20,
        "browser_tasks":     50,
        "automations":       25,
        "ai_coding":         200,
        "learning_minutes":  600,
        "save_memory":       200,
        "shopping":          100,
        "connect_ai_minutes": 300,
        "spotify_results":   25,
        "youtube_results":   25,
        "shopping_results":  25,
    },
    "ultimate": {
        "messages":          5000,
        "images":            1000,
        "file_upload":       200,
        "browser_tasks":     500,
        "automations":       200,
        "ai_coding":         2000,
        "learning_minutes":  3000,
        "save_memory":       2000,
        "shopping":          1000,
        "connect_ai_minutes": 3000,
        "spotify_results":   50,
        "youtube_results":   50,
        "shopping_results":  50,
    },
    # Admins — treated as unlimited. The is_admin() check in clamp_count
    # and usage_guard short-circuits before this dict is even consulted,
    # but include it so nothing KeyErrors if the check is bypassed.
    "admin": {
        k: -1 for k in [
            "messages", "images", "file_upload", "browser_tasks",
            "automations", "ai_coding", "learning_minutes", "save_memory",
            "shopping", "connect_ai_minutes",
            "spotify_results", "youtube_results", "shopping_results",
        ]
    },
}


def is_admin(user: User | None) -> bool:
    return bool(user and getattr(user, "is_admin", False))


def plan_key(user: User | None) -> str:
    """Return the effective plan key ('admin' for admins)."""
    if is_admin(user):
        return "admin"
    slug = (getattr(user, "plan", "free") or "free").lower()
    return slug if slug in PLAN_LIMITS else "free"


def get_limit(user: User | None, metric: str) -> int:
    """Return the raw limit for a metric. -1 = unlimited."""
    if is_admin(user):
        return -1
    return PLAN_LIMITS.get(plan_key(user), PLAN_LIMITS["free"]).get(metric, -1)


def clamp_count(
    user: User | None,
    metric: str,
    requested: int,
    *,
    hard_max: int = 200,
) -> int:
    """
    Clamp a requested result count to the plan's limit.

    Admins → no clamp (returns `requested`, capped only by hard_max).
    Free users → clamped to their plan limit.
    """
    # ── ADMIN BYPASS ─────────────────────────────────────────────────
    if is_admin(user):
        return min(max(1, requested), hard_max)
    # ─────────────────────────────────────────────────────────────────
    limit = get_limit(user, metric)
    if limit == -1:
        return min(max(1, requested), hard_max)
    return min(max(1, requested), limit)