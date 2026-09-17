from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.permission import (
    AuditLogRead,
    AuditLogListResponse,
)

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    limit: int = Query(default=50, ge=1, le=500),
    action: str | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List audit log entries for the current user, newest first."""
    stmt = (
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if status:
        stmt = stmt.where(AuditLog.status == status)

    entries = db.execute(stmt).scalars().all()
    return AuditLogListResponse(count=len(entries), logs=entries)