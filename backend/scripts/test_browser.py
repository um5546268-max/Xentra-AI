import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("https://example.com", wait_until="domcontentloaded")
    print("Title:", page.title())
    print("URL:", page.url)
    print("First 200 chars of body:")
    print(page.inner_text("body")[:200])
    browser.close()