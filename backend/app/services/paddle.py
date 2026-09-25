"""
Paddle Billing service — wraps the Paddle Python SDK.
Handles checkout session creation and webhook signature verification.
"""
from __future__ import annotations

import logging
from typing import Any

from paddle_billing import Client, Environment, Options
from paddle_billing.Entities.Shared import (
    CustomData,
    CurrencyCode,
)
from paddle_billing.Resources.Transactions.Operations import CreateTransaction
from paddle_billing.Resources.Transactions.Operations.Create import (
    TransactionCreateItemWithPrice,
)

from app.config import settings

logger = logging.getLogger(__name__)


def _client() -> Client:
    """Return an authenticated Paddle client for the configured environment."""
    env = (
        Environment.SANDBOX
        if settings.PADDLE_ENV == "sandbox"
        else Environment.PRODUCTION
    )
    return Client(
        api_key=settings.PADDLE_API_KEY,
        options=Options(environment=env),
    )


def get_price_id(plan_slug: str) -> str | None:
    """Map our internal plan slug → Paddle price ID."""
    mapping = {
        "basic": settings.PADDLE_PRICE_BASIC,
        "premium": settings.PADDLE_PRICE_PREMIUM,
        "ultimate": settings.PADDLE_PRICE_ULTIMATE,
    }
    return mapping.get(plan_slug)


def create_checkout_transaction(
    *,
    price_id: str,
    user_id: str,
    user_email: str,
    plan_slug: str,
    success_url: str,
) -> dict[str, Any]:
    """
    Create a Paddle transaction and return { transaction_id, checkout_url }.
    Paddle hosts the checkout page for us.
    """
    client = _client()

    # custom_data lets us pass our own identifiers into webhook payloads
    custom_data = CustomData(
        {
            "user_id": str(user_id),
            "plan_slug": plan_slug,
        }
    )

    transaction = client.transactions.create(
        CreateTransaction(
            items=[
                TransactionCreateItemWithPrice(
                    price_id=price_id,
                    quantity=1,
                )
            ],
            custom_data=custom_data,
            currency_code=CurrencyCode.USD,
            # Pass checkout settings as a plain dict (the SDK accepts this)
            checkout={
                "url": success_url,
            },
        )
    )

    # transaction.checkout is a Checkout object with .url when present
    checkout_url = None
    if getattr(transaction, "checkout", None):
        checkout_url = getattr(transaction.checkout, "url", None)

    return {
        "transaction_id": transaction.id,
        "checkout_url": checkout_url,
    }


def verify_webhook(raw_body: bytes, signature_header: str) -> dict[str, Any]:
    """
    Verify the Paddle webhook signature and return the parsed event as a dict.

    Raises ValueError if the signature is invalid.
    """
    client = _client()
    try:
        event = client.webhooks.unmarshal(
            request_body=raw_body,
            signature_header=signature_header,
            secret_key=settings.PADDLE_WEBHOOK_SECRET,
        )
    except Exception as e:
        logger.warning("Paddle webhook verification failed: %s", e)
        raise ValueError("Invalid webhook signature") from e

    # Paddle SDK returns an Event object — convert to dict for easier handling
    if hasattr(event, "to_dict"):
        return event.to_dict()
    if hasattr(event, "__dict__"):
        return event.__dict__
    return event  # type: ignore[return-value]