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
    2. Enrich top N with specs (slow)
    3. Score against user intent
    4. Return ranked list
    """
    # Step 1: search
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

    # Step 2: enrich top N
    candidates = products[:enrich_top_n]
    enriched = []

    for p in candidates:
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

                # If the extractor found a price, use it
                if spec_data.get("price") and not p["price"]:
                    p["price"] = spec_data["price"]
                    p["currency"] = spec_data.get("currency") or p["currency"]

                # Ratings from the spec extraction
                ratings = spec_data.get("ratings") or {}
                if ratings.get("overall") and not p.get("rating"):
                    p["rating"] = ratings["overall"]
                if ratings.get("count") and not p.get("reviews_count"):
                    p["reviews_count"] = ratings["count"]

            # Compute intent score (ALWAYS — even if enrichment failed)
            spec_data_for_scoring = {
                "specs": p.get("specs") or {},
                "price": p.get("price"),
            }
            scored = score_product(spec_data_for_scoring, intent)
            p["score"] = scored["score"]
            p["score_reasons"] = scored["reasons"]

            # Compute trust score (ALWAYS)
            trust = compute_trust_score(p)
            p["trust_score"] = trust["score"]
            p["trust_level"] = trust["level"]
            p["trust_reasons"] = trust["reasons"]

        except Exception as e:
            p["enrich_error"] = str(e)
            p["score"] = 30
            p["score_reasons"] = [f"Enrichment failed: {str(e)[:60]}"]
            p["trust_score"] = 30
            p["trust_level"] = "low"
            p["trust_reasons"] = ["Enrichment failed"]

        enriched.append(p)

        # Sort by intent score (highest first)
    enriched.sort(key=lambda p: p.get("score", 0), reverse=True)

    # Filter out low-quality results for university/work/gaming use cases
    use_case = intent.get("use_case", "general")
    if use_case in ("university", "work", "gaming"):
        # Keep products scoring at least 45
        filtered = [p for p in enriched if p.get("score", 0) >= 45]
        # But don't return empty if everything is bad
        if filtered:
            enriched = filtered

    return {
        **search_result,
        "products": enriched,
        "enriched_count": len(enriched),
    }