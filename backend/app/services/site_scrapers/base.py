"""
Base interface for e-commerce site scrapers.
Every scraper returns a list of Product dicts.
"""
from __future__ import annotations

from typing import TypedDict


class Product(TypedDict, total=False):
    site: str               # "daraz" | "amazon" | "aliexpress" | ...
    title: str
    price: float | None
    currency: str
    url: str
    image: str | None
    rating: float | None
    reviews_count: int | None
    source: str             # display name, e.g. "Daraz.pk"


class BaseScraper:
    site_name: str = "unknown"
    display_name: str = "Unknown"

    async def search(
        self,
        query: str,
        budget_max: float | None = None,
        currency: str = "PKR",
        max_results: int = 15,
    ) -> list[Product]:
        raise NotImplementedError