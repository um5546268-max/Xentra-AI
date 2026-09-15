from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.github import get_profile, list_repos

router = APIRouter(prefix="/github", tags=["github"])


@router.get("/profile")
async def profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await get_profile(db, current_user)


@router.get("/repos")
async def repos(
    per_page: int = Query(default=10, ge=1, le=50),
    sort: str = Query(default="updated"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repos = await list_repos(db, current_user, per_page, sort)
    return {"count": len(repos), "repos": repos}