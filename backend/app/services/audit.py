"""
Audit logging — record every important action.
"""
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    user_id,
    action: str,
    scope: str | None = None,
    tier: str | None = None,
    status: str = "success",
    source: str = "user",
    source_id=None,
    summary: str | None = None,
    payload: dict | None = None,
    result: dict | None = None,
    error: str | None = None,
    reversible: bool = False,
    undo_data: dict | None = None,
) -> AuditLog:
    """Create an audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        scope=scope,
        tier=tier,
        status=status,
        source=source,
        source_id=source_id,
        summary=summary,
        payload=payload,
        result=result,
        error=error,
        reversible=reversible,
        undo_data=undo_data,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
def log_quick(
    db: Session,
    user_id,
    action: str,
    summary: str | None = None,
    status: str = "success",
    error: str | None = None,
    payload: dict | None = None,
    result: dict | None = None,
) -> AuditLog:
    """
    Convenience wrapper that looks up scope/tier from the permission registry.
    """
    from app.services.permissions import PERMISSIONS

    # Derive scope from action: "browser.open" → "browser"
    scope = action.split(".")[0] if "." in action else None

    # Try to find a matching permission tier
    tier = None
    perm = PERMISSIONS.get(action)
    if perm:
        tier = perm["tier"]
    else:
        # Try any permission in the same scope
        for key, meta in PERMISSIONS.items():
            if meta["scope"] == scope:
                tier = meta["tier"]
                break

    return log_action(
        db,
        user_id,
        action=action,
        scope=scope,
        tier=tier,
        status=status,
        summary=summary,
        payload=payload,
        result=result,
        error=error,
    )