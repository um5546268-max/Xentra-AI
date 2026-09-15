import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.browser_agent import (
    open_and_read,
    click_element,
    fill_form,
)

print("=" * 60)
print("TEST 1: open_and_read (example.com)")
print("=" * 60)
r = open_and_read("https://example.com")
print(f"Title: {r['title']}")
print(f"Text length: {len(r['text'])}")
print(f"Screenshot: {len(r['screenshot_b64'])} b64 chars")
print(f"Error: {r['error']}")

print("\n" + "=" * 60)
print("TEST 2: open_and_read (python.org)")
print("=" * 60)
r = open_and_read("https://www.python.org/")
print(f"Title: {r['title']}")
print(f"Text length: {len(r['text'])}")
print(f"Screenshot: {len(r['screenshot_b64'])} b64 chars")
print(f"Error: {r['error']}")
print("First 200 chars:")
print(r['text'][:200])

print("\n" + "=" * 60)
print("TEST 3: click_element (python.org link)")
print("=" * 60)
r = click_element(
    "https://www.python.org/",
    selector="a[href='/downloads/']",
)
print(f"URL after click: {r['url']}")
print(f"Title: {r['title']}")
print(f"Error: {r['error']}")

print("\n" + "=" * 60)
print("TEST 4: fill_form (W3Schools search)")
print("=" * 60)
r = fill_form(
    "https://www.w3schools.com/",
    fields={"#search2": "python"},
    submit_selector=None,   # just verify we can type into the box
)
print(f"URL: {r['url']}")
print(f"Title: {r['title']}")
print(f"Error: {r['error']}")