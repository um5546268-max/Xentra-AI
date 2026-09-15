import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.browser_agent import open_and_read, search_google

print("=== Test 1: open_and_read ===")
r = open_and_read("https://example.com")
print(f"Title: {r['title']}")
print(f"URL: {r['url']}")
print(f"Text length: {len(r['text'])}")
print(f"Screenshot size (b64): {len(r['screenshot_b64'])} chars")
print(f"Error: {r['error']}")

print("\n=== Test 2: search_google ===")
r = search_google("best python web framework")
print(f"Results: {len(r['results'])}")
for x in r["results"][:5]:
    print(f"  - {x['title']}")
    print(f"    {x['url'][:80]}")
print(f"Screenshot size (b64): {len(r['screenshot_b64'])} chars")
print(f"Error: {r['error']}")