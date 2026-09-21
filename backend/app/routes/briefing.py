from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services.briefing import build_briefing


router = APIRouter(prefix="/briefing", tags=["briefing"])


@router.get("/today")
def get_briefing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_briefing(db, current_user)