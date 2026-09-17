from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.permission import Permission
from app.schemas.permission import (
    PermissionListResponse,
    BulkPermissionUpdateRequest,
)
from app.services.permissions import PERMISSIONS, list_all_permissions
from app.services.permission_service import (
    ensure_defaults_for_user,
    permission_summary,
)

router = APIRouter(prefix="/permissions", tags=["permissions"])


@router.get("", response_model=PermissionListResponse)
def list_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all permissions + the user's current state for each."""
    # Ensure defaults exist
    ensure_defaults_for_user(db, current_user.id)

    # Load the user's rows
    rows = db.execute(
        select(Permission).where(Permission.user_id == current_user.id)
    ).scalars().all()
    row_map = {r.key: r for r in rows}

    # Enrich with registry metadata
    enriched = []
    for key, meta in PERMISSIONS.items():
        row = row_map.get(key)
        enriched.append({
            "key": key,
            "scope": meta["scope"],
            "tier": meta["tier"],
            "label": meta["label"],
            "description": meta["description"],
            "enabled": row.enabled if row else meta.get("default", False),
        })

    # Sort by scope, then by key
    enriched.sort(key=lambda p: (p["scope"], p["key"]))

    return PermissionListResponse(
        count=len(enriched),
        permissions=enriched,
        summary=permission_summary(db, current_user),
    )


@router.patch("")
def update_permissions(
    payload: BulkPermissionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update one or more permissions."""
    ensure_defaults_for_user(db, current_user.id)

    updated = 0
    for u in payload.updates:
        if u.key not in PERMISSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown permission: {u.key}",
            )

        row = db.execute(
            select(Permission)
            .where(Permission.user_id == current_user.id)
            .where(Permission.key == u.key)
        ).scalar_one_or_none()

        if not row:
            row = Permission(
                user_id=current_user.id,
                key=u.key,
                enabled=u.enabled,
            )
            db.add(row)
        else:
            row.enabled = u.enabled
        updated += 1

    db.commit()

    return {"updated": updated}


@router.post("/reset")
def reset_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reset all permissions to defaults."""
    from app.services.permissions import get_default_for

    rows = db.execute(
        select(Permission).where(Permission.user_id == current_user.id)
    ).scalars().all()

    for row in rows:
        row.enabled = get_default_for(row.key)

    db.commit()
    return {"reset": len(rows)}
@router.get("/check")
def check_permission(
    key: str = Query(..., description="Permission key to check"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quick check: does the current user have this permission?"""
    from app.services.permission_service import is_allowed
    from app.services.permissions import get_permission

    if key not in PERMISSIONS:
        raise HTTPException(status_code=404, detail=f"Unknown permission: {key}")

    allowed = is_allowed(db, current_user, key)
    meta = get_permission(key)

    return {
        "key": key,
        "allowed": allowed,
        "scope": meta["scope"],
        "tier": meta["tier"],
        "label": meta["label"],
    }