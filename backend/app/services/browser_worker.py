"""
Standalone worker for browser actions.
Runs in its own process, invoked by browser_agent.run_in_process().
Reads a JSON payload from stdin, writes JSON result to stdout.
"""
import json
import sys
import base64

def _do_chain(steps: list[dict]) -> dict:
    """
    Run a chain of steps in a single browser session.
    Each step is a dict with 'action' and action-specific params.
    Supported actions: open, click, fill, wait, screenshot
    Returns: list of step results with screenshots.
    """
    from playwright.sync_api import sync_playwright

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.set_default_timeout(30_000)

            for i, step in enumerate(steps):
                action = step.get("action")
                step_result = {
                    "index": i,
                    "action": action,
                    "url": page.url,
                    "title": "",
                    "text": "",
                    "screenshot_b64": "",
                    "error": None,
                }

                try:
                    if action == "open":
                        page.goto(
                            step["url"],
                            wait_until="domcontentloaded",
                            timeout=30_000,
                        )
                        page.wait_for_timeout(800)

                    elif action == "click":
                        page.click(step["selector"])
                        page.wait_for_timeout(800)

                    elif action == "fill":
                        page.fill(step["selector"], step["value"])

                    elif action == "wait":
                        page.wait_for_timeout(int(step.get("ms", 1000)))

                    elif action == "screenshot":
                        pass  # just take one below

                    else:
                        step_result["error"] = f"Unknown action: {action}"
                        results.append(step_result)
                        continue

                    step_result["url"] = page.url
                    step_result["title"] = page.title()
                    step_result["text"] = page.inner_text("body")[:1500]
                    shot = page.screenshot(full_page=False)
                    step_result["screenshot_b64"] = base64.b64encode(shot).decode("ascii")

                except Exception as e:
                    step_result["error"] = str(e)

                results.append(step_result)

                # If a step fails hard, stop the chain
                if step_result["error"]:
                    break

            return {
                "steps": results,
                "final_url": page.url,
                "final_title": page.title(),
                "error": None,
            }

        except Exception as e:
            return {
                "steps": results,
                "final_url": "",
                "final_title": "",
                "error": str(e),
            }
        finally:
            browser.close()
def _do_open(url: str) -> dict:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.set_default_timeout(30_000)
            page.goto(url, wait_until="domcontentloaded", timeout=30_000)
            page.wait_for_timeout(800)

            text = ""
            for sel in ["main", "article", "#content", "body"]:
                el = page.query_selector(sel)
                if el:
                    t = el.inner_text().strip()
                    if len(t) > 200 or not text:
                        text = t
                    if len(t) > 200:
                        break

            shot = page.screenshot(full_page=False)
            return {
                "url": page.url,
                "title": page.title(),
                "text": text[:5000],
                "screenshot_b64": base64.b64encode(shot).decode("ascii"),
                "error": None,
            }
        finally:
            browser.close()


def _do_click(url: str, selector: str) -> dict:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.set_default_timeout(15_000)
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(500)
            page.click(selector)
            page.wait_for_timeout(800)

            shot = page.screenshot(full_page=False)
            return {
                "url": page.url,
                "title": page.title(),
                "text": page.inner_text("body")[:3000],
                "screenshot_b64": base64.b64encode(shot).decode("ascii"),
                "error": None,
            }
        finally:
            browser.close()


def _do_fill(url: str, fields: dict, submit_selector: str | None) -> dict:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.set_default_timeout(15_000)
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(500)

            for sel, val in fields.items():
                page.fill(sel, val)

            if submit_selector:
                page.click(submit_selector)
                page.wait_for_timeout(1500)

            shot = page.screenshot(full_page=False)
            return {
                "url": page.url,
                "title": page.title(),
                "text": page.inner_text("body")[:3000],
                "screenshot_b64": base64.b64encode(shot).decode("ascii"),
                "error": None,
            }
        finally:
            browser.close()


def main():
    try:
        raw = sys.stdin.read()
        job = json.loads(raw)
        action = job.get("action")

        if action == "open":
            result = _do_open(job["url"])
        elif action == "click":
            result = _do_click(job["url"], job["selector"])
        elif action == "fill":
            result = _do_fill(job["url"], job["fields"], job.get("submit_selector"))
        elif action == "chain":
            result = _do_chain(job["steps"])
        else:
            result = {"error": f"Unknown action: {action}", "url": "", "title": "",
                      "text": "", "screenshot_b64": ""}

        sys.stdout.write(json.dumps(result))
        sys.stdout.flush()
    except Exception as e:
        sys.stdout.write(json.dumps({
            "error": str(e), "url": "", "title": "", "text": "", "screenshot_b64": "",
        }))
        sys.stdout.flush()


if __name__ == "__main__":
    main()