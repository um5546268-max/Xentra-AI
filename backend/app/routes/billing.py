from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

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
    """
    Create a checkout session for upgrading to a plan.
    Currently a stub — real integration with Stripe/LemonSqueezy/Paddle
    will be added in Day 81.
    """
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

    return {
        "status": "not_implemented",
        "message": "Payment provider integration coming on Day 81",
        "plan_slug": plan.slug,
        "price_cents": plan.price_cents,
    }