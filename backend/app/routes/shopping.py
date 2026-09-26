from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.shopping import (
    ShoppingSearchResponse,
    ShoppingCompareRequest,
    ShoppingEnrichedResponse,
)
from app.core.rate_limit import limiter
from app.services.plan_limits import clamp_count
from app.services.shopping import search_products, enrich_and_rank
from app.services.usage_guard import enforce_limit


router = APIRouter(prefix="/shopping", tags=["shopping"])


# ═══════════════════════════════════════════════════════════════
# SEARCH (basic, fast — GET)
# ═══════════════════════════════════════════════════════════════
@router.get("/search", response_model=ShoppingSearchResponse, name="shopping_search")
def search(
    q: str = Query(min_length=2, max_length=200),
    max_results: int = Query(default=5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    _limit: None = Depends(enforce_limit("shopping")),   # ← ADD
):
    """Search products with structured intent parsing."""
    limit = clamp_count(current_user, "shopping_results", max_results)
    return search_products(
        user_query=q,
        max_results=limit,
    )


# ═══════════════════════════════════════════════════════════════
# COMPARE (deeper, slower — POST)
# ═══════════════════════════════════════════════════════════════
@router.post("/compare", name="shopping_compare")
@limiter.limit("10/minute")
def compare(
    request: Request,
    response: Response,
    payload: ShoppingCompareRequest,
    current_user: User = Depends(get_current_user),
    _limit: None = Depends(enforce_limit("shopping")),   # ← ADD
):
    """
    Search products, extract specs, score against user intent.
    Takes 20-40 seconds because it fetches & analyzes multiple pages.
    """
    limit = clamp_count(
        current_user,
        "shopping_results",
        payload.top_n or 5,
    )
    return enrich_and_rank(
        user_query=payload.query,
        budget_override=payload.budget,
        currency_override=payload.currency,
        max_results=15,          # search stage: fetch up to 15
        enrich_top_n=limit,      # 👈 renamed from `top_n` → `enrich_top_n`
    )