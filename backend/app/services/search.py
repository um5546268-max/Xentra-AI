from tavily import TavilyClient
from urllib.parse import urlparse
import re
from datetime import datetime, timezone

from app.config import settings


_client: TavilyClient | None = None


def get_client() -> TavilyClient:
    global _client
    if _client is None:
        if not settings.TAVILY_API_KEY:
            raise RuntimeError(
                "TAVILY_API_KEY is not set. Add it to backend/.env"
            )
        _client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    return _client


def _to_dict(obj) -> dict:
    """Normalize Tavily SDK responses (which may be dicts or Pydantic models)."""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    return {k: v for k, v in vars(obj).items() if not k.startswith("_")}


def web_search(
    query: str,
    max_results: int = 5,
    include_answer: bool = True,
) -> dict:
    """
    Run a web search via Tavily.

    Returns:
      {
        "query": str,
        "answer": str | None,
        "results": [{"title", "url", "content"}, ...]
      }
    """
    client = get_client()

    try:
        raw = client.search(
            query=query,
            max_results=max_results,
            include_answer=include_answer,
            search_depth="advanced",
        )
    except Exception as e:
        print(f"[search] include_answer failed: {e}; retrying without it")
        raw = client.search(
            query=query,
            max_results=max_results,
            search_depth="advanced",
        )

    data = _to_dict(raw)
    print(f"[search] Tavily returned {len(data.get('results') or [])} results")

    results = []
    for r in (data.get("results") or []):
        rd = _to_dict(r)
        results.append({
            "title": rd.get("title", ""),
            "url": rd.get("url", ""),
            "content": rd.get("content", ""),
        })

    return {
        "query": query,
        "answer": data.get("answer"),
        "results": results,
    }


def extract_pages(urls: list[str]) -> list[dict]:
    """
    Fetch full page content for a list of URLs using Tavily's extract API.
    Returns list of {"url": ..., "content": ...}.
    """
    client = get_client()
    if not urls:
        return []

    try:
        raw = client.extract(urls=urls)
    except Exception as e:
        print(f"[search] extract failed: {e}")
        return []

    data = _to_dict(raw)
    results = []
    for r in (data.get("results") or []):
        rd = _to_dict(r)
        results.append({
            "url": rd.get("url", ""),
            "content": rd.get("raw_content") or rd.get("content") or "",
        })
    return results


def detect_freshness(content: str) -> dict:
    """
    Look for date hints in content and classify freshness.
    Returns {"level": "today"|"week"|"month"|"older"|"unknown", "hint": str}
    """
    if not content:
        return {"level": "unknown", "hint": ""}

    now = datetime.now(timezone.utc)
    text = content[:2000].lower()

    # Relative markers
    if any(w in text for w in ["today", "just now", "hours ago", "minutes ago"]):
        return {"level": "today", "hint": "mentions 'today'"}
    if any(w in text for w in ["yesterday", "this week", "days ago"]):
        return {"level": "week", "hint": "mentions recent days"}

    # Absolute dates: e.g. "September 14, 2026" or "September 14 2026"
    month_names = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
    ]
    pattern = r"(" + "|".join(month_names) + r")\s+(\d{1,2}),?\s+(\d{4})"
    matches = re.findall(pattern, text)
    if matches:
        try:
            latest = None
            for m, d, y in matches:
                dt = datetime(
                    int(y), month_names.index(m) + 1, int(d), tzinfo=timezone.utc
                )
                if not latest or dt > latest:
                    latest = dt
            if latest:
                days = (now - latest).days
                if days <= 1:
                    return {"level": "today", "hint": latest.strftime("%b %d, %Y")}
                if days <= 7:
                    return {"level": "week", "hint": latest.strftime("%b %d, %Y")}
                if days <= 30:
                    return {"level": "month", "hint": latest.strftime("%b %d, %Y")}
                return {"level": "older", "hint": latest.strftime("%b %d, %Y")}
        except (ValueError, IndexError):
            pass

    return {"level": "unknown", "hint": ""}


def enrich_sources(sources: list[dict], query: str) -> list[dict]:
    """
    Deduplicate, score, and annotate search results with a trust score and freshness.
    Each source gets:
      _domain, _kind, _score, _trust, _trust_level, _trust_reasons,
      _freshness, _freshness_hint
    """
    seen = set()
    enriched = []

    q_words = [w.lower() for w in query.split() if len(w) > 3]

    for s in sources:
        url = s.get("url", "").strip()
        if not url:
            continue

        parsed = urlparse(url)
        normalized = f"{parsed.netloc}{parsed.path}".rstrip("/")
        if normalized in seen:
            continue
        seen.add(normalized)

        domain = parsed.netloc.replace("www.", "")

        # ---- Classify domain ----
        kind = "other"
        if any(d in domain for d in ["wikipedia.org", "britannica.com"]):
            kind = "wiki"
        elif any(d in domain for d in [".gov", ".edu", ".org"]):
            kind = "official"
        elif any(
            d in domain
            for d in [
                "bbc.", "reuters.", "apnews.", "nytimes.",
                "wsj.", "guardian.", "cnn.", "theverge.",
                "techcrunch.", "arstechnica.", "wired.",
            ]
        ):
            kind = "news"
        elif any(
            d in domain for d in ["reddit.", "twitter.", "x.com", "facebook."]
        ):
            kind = "social"

        # ---- Compute trust score ----
        trust = 50
        reasons: list[str] = []

        if kind == "official":
            trust += 30
            reasons.append("Official/educational domain")
        elif kind == "news":
            trust += 25
            reasons.append("Established news outlet")
        elif kind == "wiki":
            trust += 15
            reasons.append("Reference site")
        elif kind == "social":
            trust -= 25
            reasons.append("User-generated content")

        title = (s.get("title") or "").lower()
        title_hits = sum(1 for w in q_words if w in title)
        if title_hits >= 2:
            trust += 10
            reasons.append("Title matches query strongly")
        elif title_hits == 1:
            trust += 5

        content_len = len(s.get("content") or "")
        if content_len > 800:
            trust += 5
        elif content_len < 200:
            trust -= 10
            reasons.append("Very short content")

        if parsed.scheme == "https":
            trust += 5
        else:
            trust -= 15
            reasons.append("Not HTTPS")

        trust = max(0, min(100, trust))

        if trust >= 80:
            trust_level = "high"
        elif trust >= 55:
            trust_level = "medium"
        else:
            trust_level = "low"

        # ---- Freshness ----
        fresh = detect_freshness(s.get("content") or "")

        enriched.append({
            **s,
            "_domain": domain,
            "_kind": kind,
            "_score": trust,
            "_trust": trust,
            "_trust_level": trust_level,
            "_trust_reasons": reasons,
            "_freshness": fresh["level"],
            "_freshness_hint": fresh["hint"],
        })

    enriched.sort(key=lambda x: x["_trust"], reverse=True)
    return enriched