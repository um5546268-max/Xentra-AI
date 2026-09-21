from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.core.rate_limit import limiter
from app.services import bee_service
from app.services.manager_bee import plan_swarm


router = APIRouter(prefix="/bees", tags=["bees"])


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────
class SpawnBeeRequest(BaseModel):
    bee_type: str
    title: str
    description: str | None = None
    goal_dna: dict | None = None
    reversible: bool = False


class ProgressRequest(BaseModel):
    progress: int
    tool_call: dict | None = None


class FinishBeeRequest(BaseModel):
    result: dict | None = None
    error: str | None = None
    result_url: str | None = None


class VerifyRequest(BaseModel):
    passed: bool
    notes: str | None = None
    checks: list[dict] | None = None


class PermissionRequest(BaseModel):
    task_id: str | None = None
    action: str
    detail: str | None = None


class PlanSwarmRequest(BaseModel):
    goal: str


# =============================================================
# STATIC ROUTES
# =============================================================

@router.get("/hive")
@limiter.limit("120/minute")
def get_hive(
    request: Request,
    response: Response,                        # 👈 REQUIRED by slowapi
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.hive_summary(db, user)


@router.get("/tasks")
@limiter.limit("120/minute")
def list_tasks(
    request: Request,
    response: Response,                        # 👈
    active_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.list_bees(db, user.id, active_only=active_only)


@router.post("/spawn", status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def spawn(
    request: Request,
    response: Response,                        # 👈
    payload: SpawnBeeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.spawn_bee(
        db, user,
        bee_type=payload.bee_type,
        title=payload.title,
        description=payload.description,
        goal_dna=payload.goal_dna,
        reversible=payload.reversible,
    )


@router.post("/swarm/plan")
@limiter.limit("20/minute")
def swarm_plan(
    request: Request,
    response: Response,                        # 👈
    payload: PlanSwarmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = plan_swarm(payload.goal)

    manager = bee_service.spawn_bee(
        db, user,
        bee_type="manager",
        title=f"Manage: {payload.goal[:60]}",
        description=payload.goal,
        goal_dna=plan.get("goal_dna"),
    )

    created = []
    for item in plan.get("swarm", [])[:5]:
        try:
            t = bee_service.spawn_bee(
                db, user,
                bee_type=item["bee_type"],
                title=item.get("title", "Task")[:255],
                description=item.get("description"),
                goal_dna=plan.get("goal_dna"),
                parent_task_id=manager.id,
            )
            created.append(t)
        except HTTPException:
            break

    return {
        "manager": manager,
        "swarm": created,
        "quota": bee_service.get_user_quota(db, user),
    }


# =============================================================
# DYNAMIC ROUTES (no limiter — keep simple)
# =============================================================

@router.get("/tasks/{task_id}")
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service._get_owned(db, task_id, user.id)


@router.post("/tasks/{task_id}/start")
def start(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.start_bee(db, task_id, user.id)


@router.post("/tasks/{task_id}/progress")
def progress(
    task_id: str,
    payload: ProgressRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.update_progress(
        db, task_id, user.id, payload.progress, payload.tool_call,
    )


@router.post("/tasks/{task_id}/finish")
def finish(
    task_id: str,
    payload: FinishBeeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.finish_bee(
        db, task_id, user.id,
        payload.result, payload.error, payload.result_url,
    )


@router.post("/tasks/{task_id}/verify")
def verify(
    task_id: str,
    payload: VerifyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.verify_bee(
        db, task_id, user.id,
        {"passed": payload.passed, "notes": payload.notes,
         "checks": payload.checks or []},
    )


@router.post("/tasks/{task_id}/stop")
def stop(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.stop_bee(db, task_id, user.id)


@router.post("/stop-all")
def stop_all(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = bee_service.stop_all_bees(db, user.id)
    return {"stopped": count}


@router.get("/tasks/{task_id}/checkpoints")
def checkpoints(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.list_checkpoints(db, task_id, user.id)


@router.post("/tasks/{task_id}/undo/{checkpoint_id}")
def undo(
    task_id: str,
    checkpoint_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.undo_to_checkpoint(db, task_id, user.id, checkpoint_id)


@router.post("/permissions/request")
def request_perm(
    payload: PermissionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.request_permission(
        db, user, payload.task_id, payload.action, payload.detail,
    )


@router.post("/permissions/{perm_id}/grant")
def grant(
    perm_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.grant_permission(db, perm_id, user.id)


@router.post("/permissions/{perm_id}/deny")
def deny(
    perm_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return bee_service.deny_permission(db, perm_id, user.id)