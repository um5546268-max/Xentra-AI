import uuid
from datetime import datetime
from pydantic import BaseModel


class PlanRead(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    price_cents: int
    currency: str
    interval: str
    limits: dict | None
    features: dict | None
    display_order: int

    model_config = {"from_attributes": True}


class SubscriptionRead(BaseModel):
    id: uuid.UUID
    status: str
    plan_id: uuid.UUID
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    trial_ends_at: datetime | None

    model_config = {"from_attributes": True}


class BillingStatusResponse(BaseModel):
    subscription: SubscriptionRead
    plan: PlanRead
    usage: dict


class PlansListResponse(BaseModel):
    plans: list[PlanRead]


class CheckoutRequest(BaseModel):
    plan_slug: str