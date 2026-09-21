"""
Manager Bee — decomposes a goal into a swarm of Bee tasks.
Uses Goal DNA structure to decide sub-tasks.
"""
import json
from app.services.ai import chat_completion


SWARM_SYSTEM = """You are the Manager Bee inside Hive OS (product: Xentra).
Given a user's goal, break it into 1-5 sub-tasks, each handled by one worker Bee.

Available Bee types (use ONLY these):
- web        (search, research, compare)
- computer   (browser / OS control)
- coding     (write/run/debug code)
- file       (documents, PDFs, storage)
- shopping   (products, prices)
- maps       (locations, routes)
- media      (music, video, images)
- research   (deep multi-step research)
- health     (PC / system health)

Return STRICT JSON:
{
  "goal_dna": { "goal": "...", "constraints": {...} },
  "swarm": [
    { "bee_type": "web", "title": "Research best laptops", "description": "..." },
    ...
  ]
}
"""


def plan_swarm(user_goal: str) -> dict:
    raw = chat_completion(
        messages=[
            {"role": "system", "content": SWARM_SYSTEM},
            {"role": "user", "content": user_goal},
        ]
    )
    text = raw["content"].strip()
    # best-effort JSON extraction
    if "```" in text:
        text = text.split("```")[1].strip()
        if text.startswith("json"):
            text = text[4:].strip()
    try:
        return json.loads(text)
    except Exception:
        return {
            "goal_dna": {"goal": user_goal},
            "swarm": [
                {
                    "bee_type": "research",
                    "title": user_goal[:80],
                    "description": user_goal,
                }
            ],
        }