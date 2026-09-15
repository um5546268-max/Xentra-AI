from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.shopping import (
    ShoppingSearchResponse,
    ShoppingCompareRequest,
    ShoppingEnrichedResponse,
)
from app.services.shopping import search_products, enrich_and_rank

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.shopping import (
    ShoppingSearchResponse,
    ShoppingCompareRequest,
)
from app.services.shopping import search_products

router = APIRouter(prefix="/shopping", tags=["shopping"])


@router.get("/search", response_model=ShoppingSearchResponse)
def search(
    q: str = Query(min_length=2, max_length=200),
    budget: float | None = Query(default=None, gt=0),
    currency: str | None = Query(default=None, max_length=5),
    current_user: User = Depends(get_current_user),
):
    """Search for products with structured intent parsing."""
    return search_products(
        user_query=q,
        budget_override=budget,
        currency_override=currency,
    )
@router.get("/compare", response_model=ShoppingEnrichedResponse)
def compare(
    q: str = Query(min_length=2, max_length=200),
    budget: float | None = Query(default=None, gt=0),
    currency: str | None = Query(default=None, max_length=5),
    top_n: int = Query(default=5, ge=1, le=8),
    current_user: User = Depends(get_current_user),
):
    """
    Search products, extract specs, score against user intent.
    Takes 20-40 seconds because it fetches & analyzes multiple pages.
    """
    return enrich_and_rank(
        user_query=q,
        budget_override=budget,
        currency_override=currency,
        enrich_top_n=top_n,
    )