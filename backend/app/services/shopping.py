"""
Shopping agent v2 — structured query + strict product search.
"""
import re
from urllib.parse import urlparse

from app.services.search import web_search
from app.services.query_parser import parse_shopping_query


# Domains that are usually actual shopping sites (whitelist)
SHOPPING_DOMAINS = {
    # Global
    "amazon.com", "amazon.co.uk", "amazon.in", "amazon.ae",
    "ebay.com", "walmart.com", "bestbuy.com", "target.com",
    "newegg.com", "bhphotovideo.com", "aliexpress.com",
    "flipkart.com", "croma.com", "reliancedigital.in",
    # Pakistan
    "daraz.pk", "olx.com.pk", "priceoye.pk", "homeshopping.pk",
    "shophive.com", "symbios.pk", "czone.pk", "galaxy.pk",
    "telemart.pk", "mega.pk", "iShopping.pk",
    # Regional
    "noon.com", "jumia.com", "lazada.com", "shopee.com",
    # Tech sites that sometimes have structured data
    "gsmarena.com", "notebookcheck.net",
}

# Domains to always skip
BLOCKED_DOMAINS = {
    "facebook.com", "instagram.com", "twitter.com", "x.com",
    "tiktok.com", "pinterest.com", "reddit.com", "youtube.com",
    "wikipedia.org", "linkedin.com",
}


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "").lower()
    except Exception:
        return ""


def _is_shopping_domain(domain: str) -> bool:
    # Exact match or subdomain of a whitelisted domain
    for w in SHOPPING_DOMAINS:
        if domain == w or domain.endswith("." + w):
            return True
    return False


def _is_blocked(domain: str) -> bool:
    for w in BLOCKED_DOMAINS:
        if domain == w or domain.endswith("." + w):
            return True
    return False


# Strict price extraction — requires currency symbol/name nearby
CURRENCY_PATTERNS = {
    "PKR": [r"(?:Rs\.?\s*|PKR\s*|₨\s*)([\d,]+(?:\.\d+)?)"],
    "INR": [r"(?:₹\s*|INR\s*|Rs\.?\s*)([\d,]+(?:\.\d+)?)"],
    "USD": [r"(?:\$\s*|USD\s*)([\d,]+(?:\.\d+)?)"],
    "EUR": [r"(?:€\s*|EUR\s*)([\d,]+(?:\.\d+)?)"],
    "GBP": [r"(?:£\s*|GBP\s*)([\d,]+(?:\.\d+)?)"],
    "AED": [r"(?:AED\s*|د\.إ\s*)([\d,]+(?:\.\d+)?)"],
}


def _extract_price(text: str, preferred_currency: str = "PKR") -> tuple[float | None, str | None]:
    """
    Extract a price from text. Only matches when a currency symbol/name is present.
    Prefers the user's currency, then falls back to others.
    """
    if not text:
        return None, None

    # Try preferred currency first
    order = [preferred_currency] + [c for c in CURRENCY_PATTERNS if c != preferred_currency]

    for currency in order:
        for pattern in CURRENCY_PATTERNS.get(currency, []):
            for match in re.finditer(pattern, text, re.IGNORECASE):
                raw = match.group(1).replace(",", "")
                try:
                    val = float(raw)
                except ValueError:
                    continue
                # Sanity check: prices are usually 100+ and less than 100M
                if 100 <= val <= 100_000_000:
                    return val, currency

    return None, None


def search_products(
    user_query: str,
    budget_override: float | None = None,
    currency_override: str | None = None,
    max_results: int = 15,
) -> dict:
    """
    Parse the query, search, filter, and return structured product candidates.
    """
    # 1. Parse intent
    intent = parse_shopping_query(user_query)
    product_type = intent["product_type"]
    budget = budget_override or intent["budget_max"]
    currency = (currency_override or intent["currency"] or "PKR").strip()
    country = intent["country"]

    # 2. Build a search query that targets real product pages
    search_parts = [f"buy {product_type}"]
    if country == "PK":
        search_parts.append("Pakistan")
    search_parts.append("price")
    if budget:
        search_parts.append(f"under {int(budget)}")
    search_query = " ".join(search_parts)

    # 3. Search
    sr = web_search(search_query, max_results=max_results)
    sources = sr.get("results", [])

    # 4. Filter + extract
    products = []
    seen_urls = set()

    for s in sources:
        url = s.get("url", "")
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)

        domain = _domain(url)
        if _is_blocked(domain):
            continue

        # Prefer shopping domains — but include others if they have clear prices
        is_shopping = _is_shopping_domain(domain)

        title = s.get("title", "").strip()
        snippet = s.get("content", "").strip()

        # Extract price from title + snippet
        price_val, price_curr = _extract_price(
            title + " " + snippet, preferred_currency=currency
        )

        # Filter by budget (with 15% margin)
        if budget and price_val and price_val > budget * 1.15:
            continue

        # If we're in strict mode (shopping domain not matched), require a price
        if not is_shopping and price_val is None:
            continue

        products.append({
            "title": title,
            "url": url,
            "snippet": snippet[:400],
            "source": domain,
            "price": price_val,
            "currency": price_curr or currency,
            "is_shopping_site": is_shopping,
            "image": None,
            "specs": {},
        })

    # 5. Sort: products with prices first, then cheapest first
    products.sort(key=lambda p: (p["price"] is None, p["price"] or 0))

    return {
        "query": user_query,
        "intent": intent,
        "budget": budget,
        "currency": currency,
        "count": len(products),
        "products": products,
    }