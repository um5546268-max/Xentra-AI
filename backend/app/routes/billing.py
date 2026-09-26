import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.billing import (
    BillingStatusResponse,
    CheckoutRequest,
    PlanRead,
    PlansListResponse,
    SubscriptionRead,
)
from app.services import paddle as paddle_service
from app.services.billing import (
    get_or_create_subscription,
    get_user_plan,
    get_usage_summary,
)
from app.services.plan_limits import PLAN_LIMITS
from app.services.usage_tracker import get_today_count


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


# ═══════════════════════════════════════════════════════════════
# PLANS
# ═══════════════════════════════════════════════════════════════
@router.get("/plans", response_model=PlansListResponse)
def list_plans(db: Session = Depends(get_db)):
    """List all public plans."""
    plans = db.execute(
        select(Plan)
        .where(Plan.is_public == True)  # noqa: E712
        .order_by(Plan.display_order)
    ).scalars().all()
    return PlansListResponse(plans=plans)


# ═══════════════════════════════════════════════════════════════
# MY STATUS
# ═══════════════════════════════════════════════════════════════
@router.get("/me", response_model=BillingStatusResponse)
def get_billing_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current user's subscription + usage summary."""
    sub = get_or_create_subscription(db, current_user.id)
    plan = get_user_plan(db, current_user.id)
    usage = get_usage_summary(db, current_user.id)

    return BillingStatusResponse(
        subscription=SubscriptionRead.model_validate(sub),
        plan=PlanRead.model_validate(plan),
        usage=usage["usage"],
    )


# ═══════════════════════════════════════════════════════════════
# TODAY'S USAGE (per-metric, for the Your Usage panel)
# ═══════════════════════════════════════════════════════════════
@router.get("/usage-today")
def get_usage_today(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return per-metric usage for today, so the Billing page can show live counters.
    Free plan users see real live counts; paid plans see real limits.
    """
    plan_slug = (current_user.plan or "free").lower()
    limits = PLAN_LIMITS.get(plan_slug, PLAN_LIMITS["free"])

    metrics = [
        "search",
        "deep_research",
        "ai_coding",
        "file_upload",
        "shopping",
        "browser_tasks",
        "save_memory",
        "automations",
        "connect_ai_minutes",
        "learning_minutes",
    ]

    result = {}
    for metric in metrics:
        limit = limits.get(metric, -1)
        used = get_today_count(db, current_user.id, metric)
        result[metric] = {
            "used": used,
            "limit": limit,
            "remaining": -1 if limit == -1 else max(0, limit - used),
        }

    return {"plan": plan_slug, "usage": result}


# ═══════════════════════════════════════════════════════════════
# CHECKOUT (creates a real Paddle transaction)
# ═══════════════════════════════════════════════════════════════
@router.post("/checkout")
def create_checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a real Paddle checkout session for upgrading to a plan."""
    plan = db.execute(
        select(Plan).where(Plan.slug == payload.plan_slug)
    ).scalar_one_or_none()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if plan.price_cents == 0:
        raise HTTPException(
            status_code=400,
            detail="Free plan does not require checkout",
        )

    price_id = paddle_service.get_price_id(plan.slug)
    if not price_id:
        raise HTTPException(
            status_code=500,
            detail=f"No Paddle price configured for plan '{plan.slug}'",
        )

    success_url = f"{settings.FRONTEND_URL}/app/billing?checkout=success"

    try:
        result = paddle_service.create_checkout_transaction(
            price_id=price_id,
            user_id=str(current_user.id),
            user_email=current_user.email,
            plan_slug=plan.slug,
            success_url=success_url,
        )
    except Exception as e:
        logger.exception("Paddle checkout failed")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to create checkout session: {e}",
        )

    return {
        "checkout_url": result["checkout_url"],
        "transaction_id": result["transaction_id"],
    }


# ═══════════════════════════════════════════════════════════════
# WEBHOOK (Paddle → us)
# ═══════════════════════════════════════════════════════════════
@router.post("/webhook")
async def paddle_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receive webhook events from Paddle.
    Verifies signature, then updates the user's subscription in our DB.
    """
    raw_body = await request.body()
    signature = request.headers.get("Paddle-Signature", "")

    try:
        event = paddle_service.verify_webhook(raw_body, signature)
    except ValueError as e:
        logger.warning("Webhook signature rejected: %s", e)
        raise HTTPException(status_code=400, detail=str(e))

    # Normalize SDK event → dict
    if not isinstance(event, dict):
        event = getattr(event, "__dict__", {}) or {}

    event_type = event.get("event_type") or event.get("eventType")
    data = event.get("data", {}) or {}

    logger.info("Paddle webhook: %s", event_type)

    if event_type in {
        "subscription.created",
        "subscription.updated",
        "subscription.canceled",
        "subscription.activated",
        "subscription.past_due",
    }:
        await _handle_subscription_event(db, data)

    if event_type == "transaction.completed":
        custom = data.get("custom_data") or {}
        user_id = custom.get("user_id")
        plan_slug = custom.get("plan_slug")
        if user_id and plan_slug:
            await _upgrade_user(db, user_id, plan_slug, data)

    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════
# WEBHOOK HELPERS
# ═══════════════════════════════════════════════════════════════
async def _handle_subscription_event(db: Session, data: dict):
    """Update our Subscription row when Paddle sends a subscription event."""
    paddle_sub_id = data.get("id")
    if not paddle_sub_id:
        return

    sub = db.execute(
        select(Subscription).where(
            Subscription.external_subscription_id == paddle_sub_id
        )
    ).scalar_one_or_none()

    if not sub:
        return

    status = data.get("status", "active")
    sub.status = status
    sub.cancel_at_period_end = bool(data.get("scheduled_change"))

    period = data.get("current_billing_period") or {}
    if period.get("starts_at"):
        sub.current_period_start = _parse_dt(period["starts_at"])
    if period.get("ends_at"):
        sub.current_period_end = _parse_dt(period["ends_at"])

    sub.updated_at = datetime.now(timezone.utc)
    db.commit()


async def _upgrade_user(db: Session, user_id: str, plan_slug: str, data: dict):
    """
    Called when a transaction.completed event arrives.
    Ensures the user's Subscription row reflects the newly purchased plan.
    """
    import uuid as _uuid

    try:
        uid = _uuid.UUID(user_id)
    except (ValueError, AttributeError):
        return

    plan = db.execute(
        select(Plan).where(Plan.slug == plan_slug)
    ).scalar_one_or_none()
    if not plan:
        logger.warning("Webhook: unknown plan slug '%s'", plan_slug)
        return

    sub = db.execute(
        select(Subscription).where(Subscription.user_id == uid)
    ).scalar_one_or_none()

    customer_id = data.get("customer_id")
    subscription_id = data.get("subscription_id")

    if sub is None:
        sub = Subscription(
            user_id=uid,
            plan_id=plan.id,
            status="active",
            external_customer_id=customer_id,
            external_subscription_id=subscription_id,
        )
        db.add(sub)
    else:
        sub.plan_id = plan.id
        sub.status = "active"
        sub.external_customer_id = customer_id or sub.external_customer_id
        sub.external_subscription_id = (
            subscription_id or sub.external_subscription_id
        )

    sub.updated_at = datetime.now(timezone.utc)
    db.commit()

    logger.info("Upgraded user %s to plan %s", user_id, plan_slug)


def _parse_dt(value: str) -> datetime | None:
    """Parse an ISO8601 string from Paddle into a datetime."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None