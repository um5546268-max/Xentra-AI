from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.onboarding import OnboardingSubmit, OnboardingStatus
from app.services.gamification import record_activity


router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.get("/status", response_model=OnboardingStatus)
def get_status(current_user: User = Depends(get_current_user)):
    return OnboardingStatus(
        completed=bool(current_user.onboarding_completed),
        display_name=current_user.display_name,
        class_level=current_user.class_level,
        learning_goal=current_user.learning_goal,
        interests=current_user.interests or [],
        tour_completed=bool(current_user.tour_completed),
    )


@router.post("/submit", response_model=OnboardingStatus)
def submit_onboarding(
    payload: OnboardingSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.display_name = payload.display_name
    current_user.class_level = payload.class_level
    current_user.learning_goal = payload.learning_goal
    current_user.interests = payload.interests
    current_user.onboarding_completed = True

    # Give them a welcome bonus
    record_activity(db, current_user, "daily_login")

    db.commit()
    db.refresh(current_user)

    return OnboardingStatus(
        completed=True,
        display_name=current_user.display_name,
        class_level=current_user.class_level,
        learning_goal=current_user.learning_goal,
        interests=current_user.interests or [],
        tour_completed=bool(current_user.tour_completed),
    )


@router.post("/complete-tour", response_model=OnboardingStatus)
def complete_tour(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark the onboarding tour as completed for the current user."""
    current_user.tour_completed = True
    db.commit()
    db.refresh(current_user)

    return OnboardingStatus(
        completed=bool(current_user.onboarding_completed),
        display_name=current_user.display_name,
        class_level=current_user.class_level,
        learning_goal=current_user.learning_goal,
        interests=current_user.interests or [],
        tour_completed=True,
    )