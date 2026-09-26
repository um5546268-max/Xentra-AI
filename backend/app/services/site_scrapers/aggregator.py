"""
Runs all site scrapers in parallel and merges results.
"""
from __future__ import annotations

import asyncio
import logging

from .base import BaseScraper, Product
from .daraz import DarazScraper
from .amazon import AmazonScraper

logger = logging.getLogger(__name__)


# ── Register all scrapers here ──
ALL_SCRAPERS: list[type[BaseScraper]] = [
    DarazScraper,
    AmazonScraper,
    # Add more later: AliExpressScraper, eBayScraper, etc.
]


async def aggregate_search(
    query: str,
    budget_max: float | None = None,
    currency: str = "PKR",
    max_per_site: int = 15,
    sites: list[str] | None = None,
) -> list[Product]:
    """
    Search across all registered sites in parallel.
    Returns a merged, budget-filtered list sorted by price.
    """
    scrapers = ALL_SCRAPERS
    if sites:
        scrapers = [s for s in ALL_SCRAPERS if s.site_name in sites]

    tasks = [
        _safe_search(scraper(), query, budget_max, currency, max_per_site)
        for scraper in scrapers
    ]

    logger.info("[aggregator] running %d scrapers in parallel", len(tasks))
    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    merged: list[Product] = []
    for result in all_results:
        if isinstance(result, Exception):
            logger.warning("[aggregator] scraper failed: %s", result)
            continue
        merged.extend(result)

    # Dedupe by URL
    seen: set[str] = set()
    unique: list[Product] = []
    for p in merged:
        url = p.get("url") or ""
        if url and url in seen:
            continue
        if url:
            seen.add(url)
        unique.append(p)

    # Sort: cheapest first; products without price go last
    unique.sort(key=lambda p: (p.get("price") is None, p.get("price") or 0))

    logger.info("[aggregator] merged %d unique products", len(unique))
    return unique


async def _safe_search(
    scraper: BaseScraper,
    query: str,
    budget_max: float | None,
    currency: str,
    max_results: int,
) -> list[Product]:
    """Wrap each scraper so a failure doesn't crash the whole search."""
    try:
        return await scraper.search(
            query=query,
            budget_max=budget_max,
            currency=currency,
            max_results=max_results,
        )
    except Exception as e:
        logger.warning("[%s] failed: %s", scraper.site_name, e)
        return []