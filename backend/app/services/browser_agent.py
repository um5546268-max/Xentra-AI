import json
import subprocess
import sys
from pathlib import Path
from typing import Any


WORKER_PATH = Path(__file__).parent / "browser_worker.py"


def _run_worker(payload: dict, timeout: int = 90) -> dict[str, Any]:
    """
    Run browser_worker.py in a separate Python process.
    Passes payload via stdin, reads JSON result via stdout.
    """
    try:
        result = subprocess.run(
            [sys.executable, str(WORKER_PATH)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
        )

        if result.returncode != 0 and not result.stdout.strip():
            return {
                "error": f"Worker crashed (rc={result.returncode}): {result.stderr[:300]}",
                "url": payload.get("url", ""),
                "title": "", "text": "", "screenshot_b64": "",
            }

        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return {
                "error": f"Invalid worker output: {result.stdout[:200]}",
                "url": payload.get("url", ""),
                "title": "", "text": "", "screenshot_b64": "",
            }
    except subprocess.TimeoutExpired:
        return {
            "error": f"Browser worker timed out after {timeout}s",
            "url": payload.get("url", ""),
            "title": "", "text": "", "screenshot_b64": "",
        }
    except Exception as e:
        return {
            "error": str(e),
            "url": payload.get("url", ""),
            "title": "", "text": "", "screenshot_b64": "",
        }


def open_and_read(url: str, headless: bool = True) -> dict[str, Any]:
    return _run_worker({"action": "open", "url": url})


def click_element(url: str, selector: str, headless: bool = True) -> dict[str, Any]:
    return _run_worker({"action": "click", "url": url, "selector": selector})


def fill_form(
    url: str,
    fields: dict[str, str],
    submit_selector: str | None = None,
    headless: bool = True,
) -> dict[str, Any]:
    return _run_worker({
        "action": "fill",
        "url": url,
        "fields": fields,
        "submit_selector": submit_selector,
    })