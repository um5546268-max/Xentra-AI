import base64
from typing import Any
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout


DEFAULT_TIMEOUT_MS = 15_000
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/130.0.0.0 Safari/537.36"
)


def _new_page(playwright, headless: bool = True):
    browser = playwright.chromium.launch(
        headless=headless,
        args=[
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
        ],
    )
    context = browser.new_context(
        user_agent=DEFAULT_USER_AGENT,
        viewport={"width": 1280, "height": 800},
    )
    page = context.new_page()
    page.set_default_timeout(DEFAULT_TIMEOUT_MS)
    return browser, context, page


def _safe_close(browser, context) -> None:
    try:
        context.close()
    except Exception:
        pass
    try:
        browser.close()
    except Exception:
        pass


def open_and_read(url: str, headless: bool = True) -> dict[str, Any]:
    """
    Open a URL, extract title + main text, and take a screenshot.
    """
    with sync_playwright() as p:
        browser, context, page = _new_page(p, headless=headless)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=DEFAULT_TIMEOUT_MS)
            page.wait_for_timeout(800)

            title = page.title()

            text = ""
            for selector in ["main", "article", "#content", "body"]:
                try:
                    el = page.query_selector(selector)
                    if el:
                        t = el.inner_text().strip()
                        if len(t) > 200:
                            text = t
                            break
                        elif not text:
                            text = t
                except Exception:
                    continue

            screenshot = page.screenshot(full_page=False)

            return {
                "url": page.url,
                "title": title,
                "text": text[:5000],
                "screenshot_b64": base64.b64encode(screenshot).decode("ascii"),
                "error": None,
            }
        except PWTimeout:
            return {
                "url": url, "title": "", "text": "",
                "screenshot_b64": "", "error": "Timeout loading page",
            }
        except Exception as e:
            return {
                "url": url, "title": "", "text": "",
                "screenshot_b64": "", "error": str(e),
            }
        finally:
            _safe_close(browser, context)

def click_element(url: str, selector: str, headless: bool = True) -> dict[str, Any]:
    """
    Open a URL and click an element matching the selector.
    """
    with sync_playwright() as p:
        browser, context, page = _new_page(p, headless=headless)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=DEFAULT_TIMEOUT_MS)
            page.wait_for_timeout(500)

            page.click(selector, timeout=DEFAULT_TIMEOUT_MS)
            page.wait_for_timeout(800)

            text = page.inner_text("body")[:3000]
            screenshot = page.screenshot(full_page=False)

            return {
                "url": page.url,
                "title": page.title(),
                "text": text,
                "screenshot_b64": base64.b64encode(screenshot).decode("ascii"),
                "error": None,
            }
        except PWTimeout:
            return {
                "url": url, "title": "", "text": "",
                "screenshot_b64": "", "error": f"Timeout clicking '{selector}'",
            }
        except Exception as e:
            return {
                "url": url, "title": "", "text": "",
                "screenshot_b64": "", "error": str(e),
            }
        finally:
            _safe_close(browser, context)


def fill_form(
    url: str,
    fields: dict[str, str],
    submit_selector: str | None = None,
    headless: bool = True,
) -> dict[str, Any]:
    """
    Open a URL, fill inputs, optionally submit.
    `fields` maps CSS selector -> value.
    """
    with sync_playwright() as p:
        browser, context, page = _new_page(p, headless=headless)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=DEFAULT_TIMEOUT_MS)
            page.wait_for_timeout(500)

            for selector, value in fields.items():
                try:
                    page.fill(selector, value, timeout=DEFAULT_TIMEOUT_MS)
                except Exception as e:
                    return {
                        "url": page.url, "title": "", "text": "",
                        "screenshot_b64": "",
                        "error": f"Could not fill '{selector}': {e}",
                    }

            if submit_selector:
                try:
                    page.click(submit_selector, timeout=DEFAULT_TIMEOUT_MS)
                    page.wait_for_timeout(1500)
                except Exception as e:
                    return {
                        "url": page.url, "title": "", "text": "",
                        "screenshot_b64": "", "error": f"Could not submit: {e}",
                    }

            text = page.inner_text("body")[:3000]
            screenshot = page.screenshot(full_page=False)

            return {
                "url": page.url,
                "title": page.title(),
                "text": text,
                "screenshot_b64": base64.b64encode(screenshot).decode("ascii"),
                "error": None,
            }
        except Exception as e:
            return {
                "url": url, "title": "", "text": "",
                "screenshot_b64": "", "error": str(e),
            }
        finally:
            _safe_close(browser, context)
