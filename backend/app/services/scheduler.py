"""
Schedule calculator for automations.
Given an automation's schedule config, compute the NEXT run time.
"""
from datetime import datetime, timedelta, timezone


def compute_next_run(
    schedule_type: str,
    interval_minutes: int | None = None,
    time_of_day: str | None = None,
    day_of_week: int | None = None,
    from_time: datetime | None = None,
) -> datetime | None:
    """
    Compute the next time this automation should run.

    schedule_type:
      "interval" → every N minutes
      "daily"    → every day at HH:MM
      "weekly"   → every <day_of_week> at HH:MM (0=Mon, 6=Sun)
    """
    now = from_time or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    if schedule_type == "interval":
        if not interval_minutes or interval_minutes < 1:
            return None
        return now + timedelta(minutes=interval_minutes)

    if schedule_type == "daily":
        if not time_of_day:
            return None
        try:
            hour, minute = [int(x) for x in time_of_day.split(":")]
        except (ValueError, AttributeError):
            return None

        # Today at HH:MM
        candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        # If that time already passed, move to tomorrow
        if candidate <= now:
            candidate += timedelta(days=1)
        return candidate

    if schedule_type == "weekly":
        if not time_of_day or day_of_week is None:
            return None
        try:
            hour, minute = [int(x) for x in time_of_day.split(":")]
        except (ValueError, AttributeError):
            return None

        # Target day this week at HH:MM
        days_ahead = (day_of_week - now.weekday()) % 7
        candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        candidate += timedelta(days=days_ahead)

        # If that time already passed today, move to next week
        if candidate <= now:
            candidate += timedelta(days=7)
        return candidate

    return None


def should_run_now(automation) -> bool:
    """Check if an automation is due to run."""
    if not automation.enabled:
        return False
    if not automation.next_run_at:
        return False

    now = datetime.now(timezone.utc)
    next_run = automation.next_run_at
    if next_run.tzinfo is None:
        next_run = next_run.replace(tzinfo=timezone.utc)

    return next_run <= now