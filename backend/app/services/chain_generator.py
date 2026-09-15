import json
import re
from app.services.ai import chat_completion


SYSTEM_PROMPT = """You are a browser automation planner.
Given a user's goal, output a JSON array of steps to accomplish it in a browser.

Available step actions:
- {"action": "open", "url": "https://..."}
- {"action": "fill", "selector": "css-selector", "value": "text"}
- {"action": "click", "selector": "css-selector"}
- {"action": "wait", "ms": 1500}
- {"action": "screenshot"}

Rules:
1. First step MUST be "open".
2. Last step MUST be "screenshot".
3. Use real URLs the user mentions.
4. Use realistic CSS selectors. Common patterns:
   - Search box on Wikipedia: #searchInput
   - Submit button on Wikipedia: button[type='submit']
   - Google search box: input[name='q']
   - Google search button: input[name='btnK']
   - Generic search input: input[type='search'] or input[name='q']
5. If you're not sure about a selector, use a generic one.
6. Maximum 6 steps.
7. Output ONLY the JSON array. No markdown, no explanation, no code fences.

Example:
Goal: "Search Wikipedia for artificial intelligence"
Output:
[
  {"action": "open", "url": "https://www.wikipedia.org"},
  {"action": "fill", "selector": "#searchInput", "value": "artificial intelligence"},
  {"action": "click", "selector": "button[type='submit']"},
  {"action": "wait", "ms": 1500},
  {"action": "screenshot"}
]
"""


def generate_chain(goal: str) -> dict:
    """
    Ask the LLM to convert a goal into a browser chain.
    Returns {"steps": [...], "error": str | None}.
    """
    try:
        result = chat_completion(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Goal: {goal}"},
            ],
            max_tokens=800,
            temperature=0.2,
        )
    except Exception as e:
        return {"steps": [], "error": f"AI error: {e}"}

    raw = (result.get("content") or "").strip()

    # Strip markdown fences if the model added them
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    # Find the first [ ... ] block
    match = re.search(r"\[[\s\S]*\]", raw)
    if not match:
        return {"steps": [], "error": f"No JSON array in model output: {raw[:200]}"}

    try:
        steps = json.loads(match.group(0))
    except json.JSONDecodeError as e:
        return {"steps": [], "error": f"Invalid JSON: {e}"}

    if not isinstance(steps, list) or not steps:
        return {"steps": [], "error": "Model returned empty steps"}

    # Validate
    for i, s in enumerate(steps):
        if not isinstance(s, dict) or "action" not in s:
            return {"steps": [], "error": f"Step {i} missing 'action'"}
        if s["action"] not in ("open", "fill", "click", "wait", "screenshot"):
            return {"steps": [], "error": f"Step {i} has unknown action: {s['action']}"}

    return {"steps": steps, "error": None}