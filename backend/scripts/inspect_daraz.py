import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.daraz_scraper import _build_daraz_ajax_url, _fetch_json


url = _build_daraz_ajax_url("laptop under 100000")
data = _fetch_json(url)

mods = data.get("mods") or {}
items = mods.get("listItems") or []

print(f"Total items: {len(items)}\n")

if items:
    # Print the first item's keys so we can see the schema
    first = items[0]
    print("First item keys:")
    for k in sorted(first.keys()):
        print(f"  {k}: {repr(first[k])[:100]}")

    print("\n" + "=" * 60)
    print("First 5 products (name | price | rating):")
    print("=" * 60)
    for i, item in enumerate(items[:5], 1):
        name = item.get("name", "")[:60]
        price = item.get("price") or item.get("priceShow")
        rating = item.get("ratingScore", "n/a")
        print(f"{i}. {name}")
        print(f"   Price: {price} | Rating: {rating}")