"""
Amazon scraper — uses the Rainforest API when a key is configured.
If no key is set, returns an empty list (so aggregation just skips it).
"""
from __future__ import annotations

import logging
import os

import httpx

from .base import BaseScraper, Product

logger = logging.getLogger(__name__)


class AmazonScraper(BaseScraper):
    site_name = "amazon"
    display_name = "Amazon"

    async def search(
        self,
        query: str,
        budget_max: float | None = None,
        currency: str = "USD",
        max_results: int = 15,
    ) -> list[Product]:
        api_key = os.getenv("RAINFOREST_API_KEY", "").strip()
        if not api_key:
            logger.info("[amazon] RAINFOREST_API_KEY not set — skipping Amazon")
            return []

        params = {
            "api_key": api_key,
            "type": "search",
            "amazon_domain": "amazon.com",
            "search_term": query,
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    "https://api.rainforestapi.com/request",
                    params=params,
                )
                data = r.json()
        except Exception as e:
            logger.warning("[amazon] request failed: %s", e)
            return []

        results: list[Product] = []
        for item in (data.get("search_results") or [])[:max_results]:
            price_val = (item.get("price") or {}).get("value")
            if price_val is None:
                continue

            if budget_max and price_val > budget_max:
                continue

            results.append(
                Product(
                    site=self.site_name,
                    title=item.get("title") or "",
                    price=float(price_val),
                    currency=(item.get("price") or {}).get("currency") or "USD",
                    url=item.get("link") or "",
                    image=item.get("image"),
                    rating=item.get("rating"),
                    reviews_count=item.get("ratings_total"),
                    source=self.display_name,
                )
            )

        logger.info("[amazon] returned %d products", len(results))
        return results