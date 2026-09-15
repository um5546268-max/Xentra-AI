"""
Product search — routes to Daraz.pk for Pakistan, Google Shopping for other regions.
"""
import re
import json
import requests
from urllib.parse import urlparse, quote_plus
from fastapi import HTTPException

from app.config import settings


SCRAPERAPI_URL = "https://api.scraperapi.com"


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return ""


def search_products_shopping(
    query: str,
    country: str = "pk",
    language: str = "en",
    max_results: int = 20,
) -> list[dict]:
    """
    Product search dispatcher.
    - Pakistan → Daraz.pk
    - Other → Google Shopping
    """
    if not settings.SCRAPERAPI_KEY:
        raise HTTPException(
            status_code=500,
            detail="SCRAPERAPI_KEY not configured. Add it to backend/.env",
        )

    if country == "pk":
        try:
            from app.services.daraz_scraper import search_daraz
            products = search_daraz(query, max_results)
            if products:
                return products
            print("[product_search] Daraz returned 0, falling back to Google")
        except Exception as e:
            print(f"[product_search] Daraz failed: {e}")

    return _google_shopping_fallback(query, country, max_results)


def _google_shopping_fallback(
    query: str,
    country: str = "pk",
    max_results: int = 20,
) -> list[dict]:
    """
    Google Shopping fallback. Often returns empty for Pakistani queries —
    kept as a fallback for non-PK regions.
    """
    gl = country.upper()
    google_domain = f"google.com.{country}" if country == "pk" else "google.com"
    target_url = (
        f"https://www.{google_domain}/search"
        f"?q={quote_plus(query)}&tbm=shop&hl=en&gl={gl}"
    )

    params = {
        "api_key": settings.SCRAPERAPI_KEY,
        "url": target_url,
        "country_code": country,
        "autoparse": "true",
    }

    try:
        r = requests.get(SCRAPERAPI_URL, params=params, timeout=60)
    except Exception as e:
        print(f"[product_search] Google fallback error: {e}")
        return []

    if r.status_code != 200:
        print(f"[product_search] Google fallback status {r.status_code}")
        return []

    try:
        data = r.json()
    except Exception:
        return []

    items = data.get("shopping_results") or []

    products = []
    for item in items:
        products.append({
            "title": item.get("title", ""),
            "url": item.get("link", ""),
            "source": item.get("source", "Google Shopping"),
            "price": item.get("extracted_price"),
            "currency": "PKR" if country == "pk" else "USD",
            "image": item.get("thumbnail"),
            "rating": item.get("rating"),
            "reviews_count": item.get("reviews"),
            "snippet": item.get("snippet", "")[:200],
        })

    return products