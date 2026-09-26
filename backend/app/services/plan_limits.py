"""
Plan-based limits — single source of truth for what each plan allows.
Used by the usage_guard dependency to block over-limit requests.
"""
from __future__ import annotations

from app.models.user import User


# ═══════════════════════════════════════════════════════════════
# PLAN LIMITS TABLE
# -1 means unlimited
# Numeric values are per-day (or per-minute for minutes metrics)
# ═══════════════════════════════════════════════════════════════
PLAN_LIMITS: dict[str, dict[str, int]] = {
    "free": {
        "search": 3,
        "deep_research": 3,
        "ai_coding": 5,
        "file_upload": 3,
        "learning_minutes": 120,
        "shopping": 3,
        "browser_tasks": 3,
        "connect_ai_minutes": 30,
        "save_memory": 1,
        "automations": 2,
    },
    "basic": {
        "search": 15,
        "deep_research": 10,
        "ai_coding": 15,
        "file_upload": 10,
        "learning_minutes": 300,
        "shopping": 10,
        "browser_tasks": 10,
        "connect_ai_minutes": 120,
        "save_memory": 5,
        "automations": 10,
    },
    "premium": {
        "search": 50,
        "deep_research": 30,
        "ai_coding": 50,
        "file_upload": 30,
        "learning_minutes": 600,
        "shopping": 30,
        "browser_tasks": 30,
        "connect_ai_minutes": 300,
        "save_memory": 15,
        "automations": 30,
    },
    "ultimate": {
        "search": 150,
        "deep_research": 100,
        "ai_coding": 150,
        "file_upload": 100,
        "learning_minutes": -1,   # unlimited
        "shopping": 100,
        "browser_tasks": 100,
        "connect_ai_minutes": 600,
        "save_memory": 50,
        "automations": 100,
    },
}


def get_plan_limits(plan_slug: str) -> dict[str, int]:
    """Return the limit dict for a plan. Falls back to free."""
    return PLAN_LIMITS.get(plan_slug, PLAN_LIMITS["free"])


def get_limit(plan_slug: str, metric: str) -> int:
    """Return the numeric limit for a metric on a plan. -1 = unlimited."""
    return get_plan_limits(plan_slug).get(metric, -1)


# ═══════════════════════════════════════════════════════════════
# BACKWARD COMPAT — used by shopping.py
# ═══════════════════════════════════════════════════════════════
def clamp_count(user: User, metric: str, requested: int) -> int:
    """
    Clamp a requested count to the plan's limit.
    Used by shopping to cap max_results.
    """
    plan_slug = (user.plan or "free").lower()
    limit = get_limit(plan_slug, metric)
    if limit == -1:
        return requested
    return min(requested, limit)