from pydantic import BaseModel, Field
from pydantic import BaseModel, Field
from typing import Any, Optional


class ShoppingIntent(BaseModel):
    product_type: str
    budget_max: float | None = None
    budget_min: float | None = None
    currency: str
    use_case: str
    priority_features: list[str] = []
    country: str


class ProductCandidate(BaseModel):
    title: str
    url: str
    snippet: str
    source: str
    price: float | None = None
    currency: str
    is_shopping_site: bool = False
    image: str | None = None
    specs: dict = {}


class ShoppingSearchResponse(BaseModel):
    query: str
    intent: ShoppingIntent
    budget: float | None = None
    currency: str
    count: int
    products: list[ProductCandidate]


class ShoppingCompareRequest(BaseModel):
    query: str = Field(min_length=2, max_length=300)
    top_n: int = Field(default=5, ge=1, le=10)   # 👈 raise limit if needed
    budget: Optional[float] = None
    currency: Optional[str] = None


class ProductEnriched(BaseModel):
    title: str
    url: str
    snippet: str
    source: str
    price: float | None = None
    currency: str
    is_shopping_site: bool = False
    image: str | None = None
    specs: dict = {}
    product_name: str | None = None
    brand: str | None = None
    model: str | None = None
    highlights: list[str] = []
    release_year: int | None = None
    score: int = 0
    score_reasons: list[str] = []
    enrich_error: str | None = None


class ShoppingEnrichedResponse(BaseModel):
    intent: dict[str, Any]
    products: list[dict[str, Any]]
    enriched_count: int = 0
    elapsed_seconds: Optional[float] = None
    