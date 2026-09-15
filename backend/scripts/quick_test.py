import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.daraz_scraper import search_daraz

for query in ["laptop 100000", "laptop", "iphone", "headphones"]:
    print(f"\n=== Query: '{query}' ===")
    try:
        results = search_daraz(query, max_results=5)
        print(f"Got {len(results)} products")
        for i, p in enumerate(results[:5], 1):
            title = (p.get("title") or "")[:60]
            price = p.get("price")
            print(f"  [{i}] {title}")
            print(f"      Price: {price}")
    except Exception as e:
        print(f"ERROR: {e}")