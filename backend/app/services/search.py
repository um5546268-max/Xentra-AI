from tavily import TavilyClient
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
    return {
        k: v for k, v in vars(obj).items() if not k.startswith("_")
    }


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