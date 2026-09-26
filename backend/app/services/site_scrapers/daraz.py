"""
Daraz.pk scraper.
"""
from __future__ import annotations

import asyncio
import logging

from app.services.product_search import search_products_shopping

from .base import BaseScraper, Product

logger = logging.getLogger(__name__)


class DarazScraper(BaseScraper):
    site_name = "daraz"
    display_name = "Daraz.pk"

    async def search(
        self,
        query: str,
        budget_max: float | None = None,
        currency: str = "PKR",
        max_results: int = 15,
    ) -> list[Product]:
        # Query is already prepared upstream (product + budget).
        # Don't append budget again — Daraz uses AND matching.
        daraz_query = query

        logger.info("[daraz] search query: %s", daraz_query)

        # Reuse the existing sync search (wrapped in a thread to stay async-friendly)
        raw = await asyncio.to_thread(
            search_products_shopping,
            query=daraz_query,
            country="pk",
            max_results=max_results,
        )

        results: list[Product] = []
        for p in raw:
            price = p.get("price")
            if budget_max and price and price > budget_max * 1.15:
                continue

            results.append(
                Product(
                    site=self.site_name,
                    title=p.get("title", ""),
                    price=price,
                    currency=p.get("currency") or currency,
                    url=p.get("url", ""),
                    image=p.get("image"),
                    rating=p.get("rating"),
                    reviews_count=p.get("reviews_count"),
                    source=self.display_name,
                )
            )

        logger.info("[daraz] returned %d products", len(results))
        return results