import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.daraz_scraper import search_daraz


def show(label, query):
    print("=" * 60)
    print(f"{label}: '{query}'")
    print("=" * 60)
    results = search_daraz(query, max_results=10)
    print(f"\nReturned {len(results)} products\n")
    for i, p in enumerate(results[:10], 1):
        title = (p.get("title") or "")[:70]
        price = p.get("price")
        print(f"  [{i}] {title}")
        print(f"      Price: {price}")
        print(f"      URL: {(p.get('url') or '')[:80]}")
        print()
    print()


# Test 1: full natural language query
show("TEST 1 — full query", "best laptop under 100000 for university")

# Test 2: simple query
show("TEST 2 — simple query", "laptop under 100000")

# Test 3: super simple
show("TEST 3 — minimalist", "laptop")