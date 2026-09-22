from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate, GoalOut
from app.services.gamification import record_activity


router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalOut])
def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Goal)
        .where(Goal.user_id == current_user.id)
        .order_by(Goal.completed.asc(), Goal.created_at.desc())
        .limit(100)
    )
    return [GoalOut.model_validate(g) for g in db.execute(stmt).scalars().all()]


@router.post("", response_model=GoalOut, status_code=201)
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = Goal(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        target=payload.target,
        current=payload.current,
        unit=payload.unit,
        subject=payload.subject,
        deadline=payload.deadline,
        completed=False,
    )
    db.add(goal)
    record_activity(db, current_user, "tool_use")
    db.commit()
    db.refresh(goal)
    return GoalOut.model_validate(goal)


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: str,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    ).scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")

    if payload.title is not None:
        goal.title = payload.title
    if payload.description is not None:
        goal.description = payload.description
    if payload.target is not None:
        goal.target = payload.target
    if payload.current is not None:
        goal.current = payload.current
    if payload.unit is not None:
        goal.unit = payload.unit
    if payload.subject is not None:
        goal.subject = payload.subject
    if payload.deadline is not None:
        goal.deadline = payload.deadline
    if payload.completed is not None:
        goal.completed = payload.completed

    # Auto-complete when target reached
    if goal.current >= goal.target and not goal.completed:
        goal.completed = True

    db.commit()
    db.refresh(goal)
    return GoalOut.model_validate(goal)


@router.post("/{goal_id}/progress", response_model=GoalOut)
def bump_progress(
    goal_id: str,
    amount: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Increment the goal's progress by `amount`."""
    goal = db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    ).scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")

    goal.current = max(0, min(goal.target, goal.current + amount))
    if goal.current >= goal.target:
        goal.completed = True

    db.commit()
    db.refresh(goal)
    return GoalOut.model_validate(goal)


@router.delete("/{goal_id}", status_code=204)
def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.execute(
        select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    ).scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "Goal not found")
    db.delete(goal)
    db.commit()