"""
Shopping agent — uses Daraz.pk (via ScraperAPI) as the product source.
Falls back to Google Shopping for non-Pakistan queries.
"""
from urllib.parse import urlparse

from app.services.query_parser import parse_shopping_query
from app.services.product_search import search_products_shopping
from app.services.spec_extractor import extract_specs, score_product
from app.services.spec_extractor import extract_specs, score_product, compute_trust_score


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "").lower()
    except Exception:
        return ""


def search_products(
    user_query: str,
    budget_override: float | None = None,
    currency_override: str | None = None,
    max_results: int = 20,
) -> dict:
    """
    Parse query → search products (Daraz for PK, Google Shopping for other regions)
    → filter by budget → return.
    """
    # 1. Parse intent
    intent = parse_shopping_query(user_query)
    product_type = intent["product_type"]
    budget = budget_override or intent["budget_max"]
    currency = (currency_override or intent["currency"] or "PKR").strip()
    country = intent["country"]

    # Map country to 2-letter code
    country_code = "pk" if country == "PK" else country.lower()

    # 2. Build a SHORT search query — Daraz needs keywords, not sentences
        # 2. Build a SHORT search query — Daraz needs keywords, not sentences
    #    Keep it minimal: just product_type + budget.
    #    Extra keywords kill results because Daraz uses AND matching.
    search_parts = [product_type]
    if budget:
        search_parts.append(str(int(budget)))

    search_query = " ".join(search_parts)
    print(f"[shopping] Daraz search query: '{search_query}'")

    # 3. Search products
    raw_products = search_products_shopping(
        query=search_query,
        country=country_code,
        max_results=max_results,
    )

    print(f"[shopping] Got {len(raw_products)} raw products")

    # 4. Filter by budget + normalize
    products = []
    seen_urls = set()

    for p in raw_products:
        url = p.get("url", "")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)

        price = p.get("price")

        # Filter by budget (with 15% margin)
        if budget and price and price > budget * 1.15:
            continue

        # Skip products without price when budget is specified
        if budget and not price:
            continue

        products.append({
            "title": p.get("title", ""),
            "url": url,
            "snippet": p.get("snippet", ""),
            "source": p.get("source") or _domain(url),
            "price": price,
            "currency": p.get("currency") or currency,
            "image": p.get("image"),
            "rating": p.get("rating"),
            "reviews_count": p.get("reviews_count"),
            "is_shopping_site": True,
            "specs": {},
        })

    # Sort cheapest first
    products.sort(key=lambda p: (p["price"] is None, p["price"] or 0))

    return {
        "query": user_query,
        "intent": intent,
        "budget": budget,
        "currency": currency,
        "count": len(products),
        "products": products,
    }


def enrich_and_rank(
    user_query: str,
    budget_override: float | None = None,
    currency_override: str | None = None,
    max_results: int = 15,
    enrich_top_n: int = 5,
) -> dict:
    """
    1. Search products (fast)
    2. Enrich top N with specs (parallel)
    3. Score against user intent
    4. Return ranked list
    """
    import time
    from concurrent.futures import ThreadPoolExecutor, as_completed

    start = time.time()
    TOTAL_BUDGET = 45            # hard cap for the whole enrichment phase
    PER_PRODUCT_TIMEOUT = 25     # each product fetch cap

    # ── Step 1: search ──
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

    # ── Step 2: enrich top N IN PARALLEL ──
    candidates = products[:enrich_top_n]
    enriched = []

    def _enrich_one(p: dict) -> dict | None:
        """Enrich a single product. Runs inside a thread."""
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

            # Score against intent
            spec_data_for_scoring = {
                "specs": p.get("specs") or {},
                "reviews": p.get("reviews") or {},
                "price": p.get("price"),
            }
            score_info = score_product(spec_data_for_scoring, intent)
            p["score"] = score_info.get("score", 0)
            p["score_reasons"] = score_info.get("reasons", [])

            # Trust
            trust_info = compute_trust_score(p)
            p["trust_level"] = trust_info.get("level", "medium")

            return p
        except Exception as e:
            print(f"[shopping] enrich failed for {p.get('url')}: {e}")
            p["score"] = 0
            p["score_reasons"] = []
            p["specs"] = {}
            return p

    print(f"[shopping] enriching {len(candidates)} products in parallel…")

    with ThreadPoolExecutor(max_workers=2) as pool:
        future_to_product = {pool.submit(_enrich_one, p): p for p in candidates}

        for future in as_completed(future_to_product, timeout=TOTAL_BUDGET):
            # Check total budget
            if time.time() - start > TOTAL_BUDGET:
                print(f"[shopping] total budget exceeded ({TOTAL_BUDGET}s), stopping")
                break
            try:
                r = future.result(timeout=PER_PRODUCT_TIMEOUT)
                if r:
                    enriched.append(r)
            except Exception as e:
                p = future_to_product[future]
                print(f"[shopping] future failed for {p.get('url')}: {e}")
                # Still add the product with empty enrichment so user sees it
                p["score"] = 0
                p["score_reasons"] = []
                enriched.append(p)

    print(f"[shopping] enriched {len(enriched)} products in "
          f"{time.time() - start:.1f}s")

    # ── Step 3: sort by score, take top N ──
    enriched.sort(key=lambda p: p.get("score", 0), reverse=True)
    final_products = enriched[:enrich_top_n]

    return {
        "intent": intent,
        "products": final_products,
        "enriched_count": len(enriched),
        "elapsed_seconds": round(time.time() - start, 1),
    }