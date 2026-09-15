"""
Daraz.pk scraper via ScraperAPI's JSON endpoint.
Daraz returns structured JSON at /catalog/?ajax=true&q=... — no HTML parsing needed.
"""
import re
import requests
from urllib.parse import quote_plus
from fastapi import HTTPException

from app.config import settings


SCRAPERAPI_URL = "https://api.scraperapi.com"


def _build_daraz_ajax_url(query: str, page: int = 1) -> str:
    """Build Daraz AJAX catalog URL."""
    q = quote_plus(query)
    return f"https://www.daraz.pk/catalog/?ajax=true&q={q}&page={page}"


def _fetch_json(url: str, country: str = "pk") -> dict:
    """Fetch a URL via ScraperAPI and return parsed JSON."""
    if not settings.SCRAPERAPI_KEY:
        raise HTTPException(status_code=500, detail="SCRAPERAPI_KEY missing")

    params = {
        "api_key": settings.SCRAPERAPI_KEY,
        "url": url,
        "country_code": country,
    }

    try:
        r = requests.get(SCRAPERAPI_URL, params=params, timeout=60)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ScraperAPI error: {e}")

    if r.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"ScraperAPI error ({r.status_code}): {r.text[:200]}",
        )

    try:
        return r.json()
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Daraz returned invalid JSON: {e}. First 200 chars: {r.text[:200]}",
        )


def _parse_price(raw) -> float | None:
    """Extract numeric price from Daraz's price string."""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    if isinstance(raw, str):
        # "Rs. 12,000" → 12000
        cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _normalize_item(item: dict) -> dict | None:
    """Convert a Daraz listItem into our standard product shape."""
    if not isinstance(item, dict):
        return None

    title = item.get("name") or item.get("title") or ""
    if not title:
        return None

    # Price: try multiple fields
    price = (
        _parse_price(item.get("price"))
        or _parse_price(item.get("priceShow"))
        or _parse_price(item.get("originalPrice"))
    )

    # URL: Daraz provides either "productUrl" (full or relative) or "itemId"
    url = item.get("productUrl") or item.get("itemUrl") or ""
    if url and url.startswith("//"):
        url = "https:" + url
    elif url and url.startswith("/"):
        url = "https://www.daraz.pk" + url
    elif not url and item.get("itemId"):
        url = f"https://www.daraz.pk/products/{item['itemId']}.html"

    # Image
    image = item.get("image") or item.get("thumbnail") or ""
    if image and image.startswith("//"):
        image = "https:" + image

    # Rating
    rating = item.get("ratingScore")
    try:
        rating = float(rating) if rating is not None else None
    except (ValueError, TypeError):
        rating = None

    # Reviews
    reviews = item.get("review")
    try:
        reviews = int(reviews) if reviews is not None else None
    except (ValueError, TypeError):
        reviews = None

    return {
        "title": title.strip(),
        "url": url,
        "source": "daraz.pk",
        "price": price,
        "currency": "PKR",
        "image": image or None,
        "rating": rating,
        "reviews_count": reviews,
        "snippet": item.get("sellerName") or item.get("location") or "",
        "location": item.get("location"),
        "seller": item.get("sellerName"),
    }


def search_daraz(query: str, max_results: int = 20) -> list[dict]:
    """
    Search Daraz.pk for products via the AJAX JSON endpoint.
    """
    url = _build_daraz_ajax_url(query)
    print(f"[daraz] Fetching: {url}")

    data = _fetch_json(url)
    print(f"[daraz] Received JSON with {len(str(data))} chars")

    # Find products in the response
    mods = data.get("mods") or {}
    items = mods.get("listItems") or []
    print(f"[daraz] Found {len(items)} raw items")

    products = []
    seen_ids = set()

    for item in items:
        normalized = _normalize_item(item)
        if not normalized:
            continue

        # Deduplicate by URL
        key = normalized["url"]
        if key in seen_ids:
            continue
        seen_ids.add(key)
        products.append(normalized)

        if len(products) >= max_results:
            break

    print(f"[daraz] Returning {len(products)} unique products")
    return products