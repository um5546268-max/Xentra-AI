from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.gamification import level_from_points


router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/me")
def get_my_stats(
    current_user: User = Depends(get_current_user),
):
    return {
        "points": current_user.points or 0,
        "streak_days": current_user.streak_days or 0,
        "last_active_date": current_user.last_active_date,
        **level_from_points(current_user.points or 0),
    }


@router.post("/daily-checkin")
def daily_checkin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Called once per day from the frontend — keeps the streak alive."""
    from app.services.gamification import record_activity
    return record_activity(db, current_user, "daily_login")