from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
import logging
logger = logging.getLogger(__name__)

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.plan import Plan
from app.schemas.billing import (
    PlanRead,
    PlansListResponse,
    BillingStatusResponse,
    SubscriptionRead,
    CheckoutRequest,
)
from app.services.billing import (
    get_or_create_subscription,
    get_user_plan,
    get_usage_summary,
)
from fastapi import Request
from datetime import datetime, timezone
from sqlalchemy import select
from app.models.subscription import Subscription
from app.services import paddle as paddle_service
from app.config import settings

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans", response_model=PlansListResponse)
def list_plans(db: Session = Depends(get_db)):
    """List all public plans."""
    plans = db.execute(
        select(Plan)
        .where(Plan.is_public == True)  # noqa: E712
        .order_by(Plan.display_order)
    ).scalars().all()
    return PlansListResponse(plans=plans)


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

    result = paddle_service.create_checkout_transaction(
        price_id=price_id,
        user_id=str(current_user.id),
        user_email=current_user.email,
        plan_slug=plan.slug,
        success_url=success_url,
    )

    return {
        "checkout_url": result["checkout_url"],
        "transaction_id": result["transaction_id"],
    }
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
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event.get("event_type")
    data = event.get("data", {}) or {}

    logger.info("Paddle webhook: %s", event_type)

    # Only handle subscription lifecycle events for now
    if event_type in {
        "subscription.created",
        "subscription.updated",
        "subscription.canceled",
        "subscription.activated",
        "subscription.past_due",
    }:
        await _handle_subscription_event(db, data)

    # Also handle completed transactions (payment succeeded)
    if event_type == "transaction.completed":
        custom = (data.get("custom_data") or {})
        user_id = custom.get("user_id")
        plan_slug = custom.get("plan_slug")
        if user_id and plan_slug:
            await _upgrade_user(db, user_id, plan_slug, data)

    return {"status": "ok"}


# ─── Helpers ───
async def _handle_subscription_event(db: Session, data: dict):
    """Update Subscription row when Paddle sends a subscription event."""
    paddle_sub_id = data.get("id")
    custom = (data.get("custom_data") or {})
    user_id_str = custom.get("user_id")

    if not paddle_sub_id or not user_id_str:
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

    # Parse period dates if present
    period = data.get("current_billing_period") or {}
    if period.get("starts_at"):
        sub.current_period_start = datetime.fromisoformat(
            period["starts_at"].replace("Z", "+00:00")
        )
    if period.get("ends_at"):
        sub.current_period_end = datetime.fromisoformat(
            period["ends_at"].replace("Z", "+00:00")
        )

    sub.updated_at = datetime.now(timezone.utc)
    db.commit()


async def _upgrade_user(db: Session, user_id: str, plan_slug: str, data: dict):
    """
    Called when a transaction is completed.
    Sets up (or updates) the user's Subscription row to reflect the new plan.
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
        return

    sub = db.execute(
        select(Subscription).where(Subscription.user_id == uid)
    ).scalar_one_or_none()

    customer_id = data.get("customer_id")

    if sub is None:
        sub = Subscription(
            user_id=uid,
            plan_id=plan.id,
            status="active",
            external_customer_id=customer_id,
            external_subscription_id=data.get("subscription_id"),
        )
        db.add(sub)
    else:
        sub.plan_id = plan.id
        sub.status = "active"
        sub.external_customer_id = customer_id or sub.external_customer_id
        sub.external_subscription_id = (
            data.get("subscription_id") or sub.external_subscription_id
        )

    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    logger.info("Upgraded user %s to plan %s", user_id, plan_slug)