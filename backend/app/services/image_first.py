"""
Image-first queries: fetch a relevant image BEFORE the text response.
Used for "who is X", "where is X", "what is X" style questions.
"""
import re
import requests
from typing import Optional

from app.config import settings


# ═══════════════════════════════════════════════════════════════
# INTENT DETECTION
# ═══════════════════════════════════════════════════════════════
IMAGE_QUERY_PATTERNS = [
    r"^who\s+is\s+",
    r"^who\s+was\s+",
    r"^who\s+are\s+",
    r"^where\s+is\s+",
    r"^where\s+are\s+",
    r"^what\s+is\s+",
    r"^what\s+are\s+",
    r"^tell\s+me\s+about\s+",
    r"^show\s+me\s+",
    r"^pictures?\s+of\s+",
    r"^images?\s+of\s+",
    r"^photos?\s+of\s+",
]


def detect_image_query(text: str) -> bool:
    """Return True if the message looks like a topic lookup."""
    lower = text.lower().strip()
    return any(re.match(p, lower) for p in IMAGE_QUERY_PATTERNS)


def extract_topic(text: str) -> str:
    """Strip the question prefix to get the topic."""
    lower = text.lower().strip()
    for p in IMAGE_QUERY_PATTERNS:
        m = re.match(p, lower)
        if m:
            return text[m.end():].strip().rstrip("?.!")
    return text.strip()


# ═══════════════════════════════════════════════════════════════
# IMAGE FETCHERS
# ═══════════════════════════════════════════════════════════════
def _wikipedia_image(topic: str) -> Optional[dict]:
    """
    Fetch the primary image from Wikipedia for a topic.
    Free, no API key needed.
    """
    try:
        # Step 1: find the page title
        search_url = "https://en.wikipedia.org/w/api.php"
        r = requests.get(
            search_url,
            params={
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": topic,
                "srlimit": 1,
            },
            timeout=8,
        )
        r.raise_for_status()
        results = r.json().get("query", {}).get("search", [])
        if not results:
            return None

        title = results[0]["title"]

        # Step 2: get the main image for that page
        r = requests.get(
            search_url,
            params={
                "action": "query",
                "format": "json",
                "prop": "pageimages",
                "piprop": "original|thumbnail",
                "pithumbsize": 800,
                "titles": title,
            },
            timeout=8,
        )
        r.raise_for_status()
        pages = r.json().get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail") or {}
            original = page.get("original") or {}
            url = thumb.get("source") or original.get("source")
            if url:
                return {
                    "url": url,
                    "source": "wikipedia",
                    "title": title,
                    "page_url": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                }
    except Exception as e:
        print(f"[image_first] wikipedia failed: {e}")
    return None


def _unsplash_image(topic: str) -> Optional[dict]:
    """
    Fallback: Unsplash Source (free, no API key, may be deprecated).
    Prefer real Unsplash API if you have a key.
    """
    access_key = getattr(settings, "UNSPLASH_ACCESS_KEY", "") or ""
    if access_key:
        try:
            r = requests.get(
                "https://api.unsplash.com/search/photos",
                params={"query": topic, "per_page": 1, "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {access_key}"},
                timeout=8,
            )
            r.raise_for_status()
            results = r.json().get("results", [])
            if results:
                photo = results[0]
                return {
                    "url": photo["urls"]["regular"],
                    "source": "unsplash",
                    "title": photo.get("alt_description", topic),
                    "page_url": photo["links"]["html"],
                }
        except Exception as e:
            print(f"[image_first] unsplash failed: {e}")
    return None


def fetch_topic_image(topic: str) -> Optional[dict]:
    """
    Try Wikipedia first (best for people, places, things).
    Fall back to Unsplash (best for concepts, aesthetics).
    """
    topic = extract_topic(topic)
    if not topic:
        return None

    # Try Wikipedia — great for entities
    img = _wikipedia_image(topic)
    if img:
        return img

    # Fall back to Unsplash — great for concepts
    return _unsplash_image(topic)