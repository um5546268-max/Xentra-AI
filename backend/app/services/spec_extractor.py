"""
Extract structured specs + reviews from a product page.
Uses Tavily's extract API + LLM parsing.
"""
import json
import re
from app.services.search import extract_pages
from app.services.ai import chat_completion


SYSTEM_PROMPT = """You extract product specifications, reviews, and trust signals from web page content.

Return ONLY a JSON object with these fields (null if unknown):
{
  "product_name": "full product name",
  "brand": "brand name",
  "model": "model number/name",
  "price": number | null,
  "currency": "PKR" | "USD" | "INR" | "EUR" | "GBP" | null,
  "specs": {
    "cpu": "processor",
    "ram": "RAM",
    "storage": "storage",
    "gpu": "graphics",
    "display": "screen",
    "battery": "battery",
    "weight": "weight",
    "os": "operating system",
    "ports": "port summary",
    "camera": "webcam spec",
    "warranty": "warranty info"
  },
  "ratings": {
    "overall": number | null,
    "count": number | null
  },
  "reviews": {
    "summary": "1-2 sentence summary of what reviewers say",
    "positives": ["what users like"],
    "negatives": ["what users complain about"],
    "sentiment": "positive" | "mixed" | "negative" | "unknown",
    "sample_count": number
  },
  "trust_signals": {
    "official_seller": true | false,
    "has_warranty": true | false,
    "return_policy": "string or null",
    "suspicious_flags": ["list of concerns, if any"]
  },
  "highlights": ["3-4 short selling points"],
  "release_year": number | null
}

Rules:
- Extract only what's present. Do NOT invent specs.
- For reviews: summarize only if actual reviews/comments appear in the content.
  If no reviews are present, set sentiment to "unknown" and review arrays empty.
- For trust_signals: flag suspicious patterns like "like new", "used", "refurbished",
  "no warranty", "imported", missing brand, or mismatched prices.
- If the page doesn't look like a single product page, set "product_name" to null.
- Output ONLY JSON. No markdown, no explanation.

Example output for a laptop page:
{
  "product_name": "HP Pavilion 15-eg2015TU",
  "brand": "HP",
  "model": "15-eg2015TU",
  "price": 89999,
  "currency": "PKR",
  "specs": {
    "cpu": "Intel Core i5-1235U",
    "ram": "16GB DDR4",
    "storage": "512GB NVMe SSD",
    "gpu": "Intel Iris Xe Graphics",
    "display": "15.6 inch FHD IPS",
    "battery": "41Wh 3-cell",
    "weight": "1.75 kg",
    "os": "Windows 11 Home",
    "ports": "1x USB-C, 2x USB-A, HDMI, headphone",
    "camera": "720p HD",
    "warranty": "1 year international"
  },
  "ratings": { "overall": 4.5, "count": 87 },
  "reviews": {
    "summary": "Users praise battery life and portability; a few mention fan noise under load.",
    "positives": ["Battery life", "Lightweight", "Good screen"],
    "negatives": ["Fan noise under load"],
    "sentiment": "positive",
    "sample_count": 87
  },
  "trust_signals": {
    "official_seller": true,
    "has_warranty": true,
    "return_policy": "7-day return",
    "suspicious_flags": []
  },
  "highlights": ["12th gen i5", "16GB RAM", "Lightweight 1.75kg"],
  "release_year": 2024
}
"""


def _strip_json(raw: str) -> str:
    raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    raw = re.sub(r"\s*```$", "", raw)
    return raw


def extract_specs(url: str) -> dict:
    """
    Fetch a product page and extract structured specs + reviews.
    Returns {"specs": {...}, "error": str | None}.
    """
    # Fetch the page
    try:
        pages = extract_pages([url])
    except Exception as e:
        return {"specs": {}, "error": f"Extract failed: {e}"}

    if not pages or not pages[0].get("content"):
        return {"specs": {}, "error": "No content extracted"}

    content = pages[0]["content"][:3000]

    # Ask the LLM to parse specs + reviews
    try:
        result = chat_completion(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"URL: {url}\n\nContent:\n{content}"},
            ],
            max_tokens=2000,
            temperature=0.1,
        )
    except Exception as e:
        return {"specs": {}, "error": f"AI error: {e}"}

    raw = (result.get("content") or "").strip()
    raw = _strip_json(raw)

    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        return {"specs": {}, "error": "No JSON in model output"}

    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as e:
        return {"specs": {}, "error": f"Invalid JSON: {e}"}

    return {"specs": data, "error": None}


def score_product(product_specs: dict, intent: dict) -> dict:
    """
    Score a product against the user's intent (0-100).
    Returns {"score": int, "reasons": [...]}.
    """
    score = 50  # neutral baseline
    reasons = []

    specs = product_specs.get("specs") or {}
    price = product_specs.get("price")
    use_case = intent.get("use_case") or "general"
    budget = intent.get("budget_max")
    priority = intent.get("priority_features") or []

    # Price score
    if budget and price:
        if price <= budget * 0.7:
            score += 15
            reasons.append("Well under budget")
        elif price <= budget:
            score += 10
            reasons.append("Within budget")
        elif price <= budget * 1.1:
            score += 0
            reasons.append("Slightly over budget")
        else:
            score -= 20
            reasons.append("Over budget")

    # Use-case specific scoring
    if use_case == "university":
        if specs.get("ram") and any(
            x in specs["ram"].lower() for x in ["16gb", "32gb"]
        ):
            score += 8
            reasons.append("Good RAM for university")
        if specs.get("storage") and "ssd" in specs["storage"].lower():
            score += 5
            reasons.append("SSD storage")
        if specs.get("weight"):
            m = re.search(r"([\d.]+)\s*kg", specs["weight"])
            if m:
                w = float(m.group(1))
                if w <= 1.6:
                    score += 8
                    reasons.append("Lightweight for carrying")
                elif w <= 2.0:
                    score += 4

    elif use_case == "gaming":
        if specs.get("gpu"):
            gpu = specs["gpu"].lower()
            if any(x in gpu for x in ["rtx", "gtx", "radeon rx"]):
                score += 15
                reasons.append("Dedicated gaming GPU")
        if specs.get("ram") and any(
            x in specs["ram"].lower() for x in ["16gb", "32gb"]
        ):
            score += 5
            reasons.append("Enough RAM for gaming")

    elif use_case == "work":
        if specs.get("cpu"):
            cpu = specs["cpu"].lower()
            if any(
                x in cpu
                for x in [
                    "i5", "i7", "i9",
                    "ryzen 5", "ryzen 7",
                    "m1", "m2", "m3",
                ]
            ):
                score += 10
                reasons.append("Strong CPU for work")

    # Priority features
    for feature in priority:
        feature_l = feature.lower()
        for k, v in specs.items():
            if v and feature_l in str(v).lower():
                score += 3
                reasons.append(f"Matches '{feature}'")
                break

    # Penalty: no specs extracted at all
    if not any(specs.values()):
        score -= 20
        reasons.append("No specs available")

    score = max(0, min(100, score))

    return {"score": score, "reasons": reasons[:6]}


def compute_trust_score(product: dict) -> dict:
    """
    Compute a 0-100 trust score for a product.
    Returns {"score": int, "level": "high|medium|low", "reasons": [...]}.
    """
    score = 50  # neutral
    reasons = []

    rating = product.get("rating")
    reviews = product.get("reviews_count") or 0
    source = (product.get("source") or "").lower()
    specs = product.get("specs") or {}
    trust_signals = product.get("trust_signals") or {}

    # Rating weight (up to +25)
    if rating:
        try:
            r = float(rating)
            if r >= 4.5:
                score += 25
                reasons.append(f"Excellent rating ({r}★)")
            elif r >= 4.0:
                score += 15
                reasons.append(f"Good rating ({r}★)")
            elif r >= 3.5:
                score += 5
                reasons.append(f"Okay rating ({r}★)")
            elif r < 3.0:
                score -= 15
                reasons.append(f"Poor rating ({r}★)")
        except (ValueError, TypeError):
            pass

    # Review count weight (up to +15)
    try:
        reviews_int = int(reviews) if reviews else 0
    except (ValueError, TypeError):
        reviews_int = 0

    if reviews_int >= 100:
        score += 15
        reasons.append(f"{reviews_int} reviews")
    elif reviews_int >= 20:
        score += 8
        reasons.append(f"{reviews_int} reviews")
    elif reviews_int >= 5:
        score += 3
    elif reviews_int == 0:
        score -= 10
        reasons.append("No reviews yet")

    # Source trust
    trusted_stores = [
        "daraz.pk", "mega.pk", "priceoye.pk",
        "homeshopping.pk", "telemart.pk", "symbios.pk",
    ]
    if any(s in source for s in trusted_stores):
        score += 10
        reasons.append("Trusted store")

    # Specs present
    spec_count = sum(1 for v in specs.values() if v)
    if spec_count >= 6:
        score += 10
        reasons.append("Complete specs")
    elif spec_count >= 3:
        score += 5
        reasons.append("Some specs available")
    elif spec_count == 0:
        score -= 10
        reasons.append("No specs available")

    # Warranty
    if trust_signals.get("has_warranty"):
        score += 5
        reasons.append("Warranty included")

    # Suspicious flags
    flags = trust_signals.get("suspicious_flags") or []
    if flags:
        score -= len(flags) * 5
        for f in flags[:2]:
            reasons.append(f"Suspicious: {f}")

    score = max(0, min(100, score))

    if score >= 80:
        level = "high"
    elif score >= 55:
        level = "medium"
    else:
        level = "low"

    return {
        "score": score,
        "level": level,
        "reasons": reasons[:6],
    }