"""
Shopping agent — searches multiple sites in parallel (Daraz + Amazon + ...).
Falls back gracefully if a site's scraper fails.
"""
from urllib.parse import urlparse

from app.services.query_parser import parse_shopping_query
from app.services.site_scrapers import aggregate_search
from app.services.spec_extractor import extract_specs, score_product, compute_trust_score


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "").lower()
    except Exception:
        return ""


# ═══════════════════════════════════════════════════════════════
# SEARCH — fast, no enrichment
# ═══════════════════════════════════════════════════════════════
def search_products(
    user_query: str,
    budget_override: float | None = None,
    currency_override: str | None = None,
    max_results: int = 20,
) -> dict:
    """Parse query → search ALL sites in parallel → filter by budget → return."""
    import asyncio

    intent = parse_shopping_query(user_query)
    product_type = intent["product_type"]
    budget = budget_override or intent["budget_max"]
    currency = (currency_override or intent["currency"] or "PKR").strip()

    search_query = product_type
    print(f"[shopping] multi-site search query: '{search_query}' (budget filter: {budget})")

    try:
        raw_products = asyncio.run(
            aggregate_search(
                query=search_query,
                budget_max=budget,
                currency=currency,
                max_per_site=max_results,
            )
        )
    except RuntimeError:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            raw_products = pool.submit(
                asyncio.run,
                aggregate_search(
                    query=search_query,
                    budget_max=budget,
                    currency=currency,
                    max_per_site=max_results,
                ),
            ).result()

    print(f"[shopping] Got {len(raw_products)} products from all sites")

    products = []
    seen_urls = set()

    for p in raw_products:
        url = p.get("url", "")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)

        price = p.get("price")

        if budget and price and price > budget * 1.15:
            continue
        if budget and not price:
            continue

        products.append({
            "title": p.get("title", ""),
            "url": url,
            "snippet": p.get("snippet", ""),
            "source": p.get("source") or _domain(url),
            "site": p.get("site") or "unknown",
            "price": price,
            "currency": p.get("currency") or currency,
            "image": p.get("image"),
            "rating": p.get("rating"),
            "reviews_count": p.get("reviews_count"),
            "is_shopping_site": True,
            "specs": {},
        })

    products.sort(key=lambda p: (p["price"] is None, p["price"] or 0))

    return {
        "query": user_query,
        "intent": intent,
        "budget": budget,
        "currency": currency,
        "count": len(products),
        "products": products,
    }


# ═══════════════════════════════════════════════════════════════
# ENRICH + RANK — slower, richer output
# ═══════════════════════════════════════════════════════════════
def enrich_and_rank(
    user_query: str,
    budget_override: float | None = None,
    currency_override: str | None = None,
    max_results: int = 15,
    enrich_top_n: int = 5,
) -> dict:
    """
    1. Search products (fast, multi-site)
    2. Enrich top N with specs (sequential — safe with LLM rate limits)
    3. Score against user intent
    4. Return ranked list
    """
    import time

    start = time.time()
    TOTAL_BUDGET = 90  # generous — sequential enrichment can take longer

    # ── Step 1: search (multi-site) ──
    search_result = search_products(
        user_query=user_query,
        budget_override=budget_override,
        currency_override=currency_override,
        max_results=max_results,
    )
    products = search_result["products"]
    intent = search_result["intent"]

    if not products:
        return {**search_result, "enriched_count": 0}

    # ── Step 2: enrich top N SEQUENTIALLY (avoids Groq rate limits) ──
    candidates = products[:enrich_top_n]
    enriched = []

    def _enrich_one(p: dict) -> dict:
        """Enrich a single product. Never raises."""
        try:
            result = extract_specs(p["url"])

            if result.get("error"):
                p["enrich_error"] = result["error"]
                p["specs"] = {}
            else:
                spec_data = result["specs"]
                p["specs"] = spec_data.get("specs") or {}
                p["product_name"] = spec_data.get("product_name") or p["title"]
                p["brand"] = spec_data.get("brand")
                p["model"] = spec_data.get("model")
                p["highlights"] = spec_data.get("highlights") or []
                p["release_year"] = spec_data.get("release_year")
                p["reviews"] = spec_data.get("reviews") or {}
                p["trust_signals"] = spec_data.get("trust_signals") or {}

                if spec_data.get("price") and not p["price"]:
                    p["price"] = spec_data["price"]
                    p["currency"] = spec_data.get("currency") or p["currency"]

                ratings = spec_data.get("ratings") or {}
                if ratings.get("overall") and not p.get("rating"):
                    p["rating"] = ratings["overall"]
                if ratings.get("count") and not p.get("reviews_count"):
                    p["reviews_count"] = ratings["count"]

            spec_data_for_scoring = {
                "specs": p.get("specs") or {},
                "reviews": p.get("reviews") or {},
                "price": p.get("price"),
            }
            score_info = score_product(spec_data_for_scoring, intent)
            p["score"] = score_info.get("score", 0)
            p["score_reasons"] = score_info.get("reasons", [])

            trust_info = compute_trust_score(p)
            p["trust_level"] = trust_info.get("level", "medium")

            return p
        except Exception as e:
            print(f"[shopping] enrich failed for {p.get('url')}: {e}")
            p["score"] = 0
            p["score_reasons"] = []
            p["specs"] = {}
            return p

    print(f"[shopping] enriching {len(candidates)} products sequentially…")

    for i, p in enumerate(candidates):
        if time.time() - start > TOTAL_BUDGET:
            print(f"[shopping] total budget exceeded ({TOTAL_BUDGET}s), stopping enrichment")
            # Still include remaining products with empty enrichment
            for remaining in candidates[i:]:
                remaining.setdefault("score", 0)
                remaining.setdefault("score_reasons", [])
                remaining.setdefault("specs", {})
                enriched.append(remaining)
            break

        try:
            enriched.append(_enrich_one(p))
        except Exception as e:
            print(f"[shopping] product {i} crashed: {e}")
            p["score"] = 0
            p["score_reasons"] = []
            enriched.append(p)

    print(
        f"[shopping] enriched {len(enriched)} products in "
        f"{time.time() - start:.1f}s"
    )

    # ── Step 3: sort by score, take top N ──
    enriched.sort(key=lambda p: p.get("score", 0), reverse=True)
    final_products = enriched[:enrich_top_n]

    return {
        "intent": intent,
        "products": final_products,
        "enriched_count": len(enriched),
        "elapsed_seconds": round(time.time() - start, 1),
    }