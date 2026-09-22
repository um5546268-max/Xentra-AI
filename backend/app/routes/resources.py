import json
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.deps import get_current_user
from app.models.user import User
from app.services.ai import chat_completion


router = APIRouter(prefix="/resources", tags=["resources"])


class ResourceQuery(BaseModel):
    topic: str
    class_name: str | None = None
    kind: str = "mixed"


RESOURCE_SYSTEM = """You are a JSON generator. You ONLY output raw JSON.

Given a topic, suggest 6-8 high-quality, real learning resources.

Schema (strict — no extra fields):
{
  "resources": [
    {
      "type": "video" | "website" | "pdf" | "course",
      "title": "short descriptive title",
      "url": "real URL",
      "source": "YouTube | Khan Academy | MDN | freeCodeCamp | etc.",
      "description": "one sentence",
      "difficulty": "beginner" | "intermediate" | "advanced"
    }
  ]
}

Rules:
- Only well-known resources (Khan Academy, freeCodeCamp, MDN, official docs, YouTube channels like CrashCourse, CS50, 3Blue1Brown, Programming with Mosh, etc.)
- Never invent URLs. If unsure, use the platform's main page (e.g. https://www.freecodecamp.org)
- 2-3 videos, 2-3 websites, 1-2 courses/PDFs
- Exactly 6-8 items
- Start with { and end with }. Nothing before or after.
- No markdown. No explanation. No "here are..." preamble."""


def _strip_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _parse_resources(raw: str) -> list[dict]:
    cleaned = _strip_json(raw)
    data: Any = None

    # Try direct parse
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try extracting the first {...}
    if data is None:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            try:
                data = json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                pass

    # Try finding a "resources" array specifically
    if data is None:
        match = re.search(r'"resources"\s*:\s*(\[.*?\])', cleaned, re.DOTALL)
        if match:
            try:
                data = {"resources": json.loads(match.group(1))}
            except json.JSONDecodeError:
                pass

    if not data:
        return []

    resources = data.get("resources", [])
    if not isinstance(resources, list):
        return []

    cleaned_resources = []
    for r in resources:
        if not isinstance(r, dict):
            continue
        if not r.get("title") or not r.get("url"):
            continue
        if r.get("type") not in ("video", "website", "pdf", "course"):
            r["type"] = "website"
        cleaned_resources.append({
            "type": r.get("type", "website"),
            "title": str(r.get("title", ""))[:200],
            "url": str(r.get("url", ""))[:500],
            "source": str(r.get("source", "Web"))[:60],
            "description": str(r.get("description", ""))[:300],
            "difficulty": r.get("difficulty", "beginner"),
        })

    return cleaned_resources


def _fallback_resources(topic: str) -> list[dict]:
    """When Groq fails, return curated generic resources."""
    t = topic.strip()
    return [
        {
            "type": "video",
            "title": f"Introduction to {t}",
            "url": "https://www.youtube.com/results?search_query=" + t.replace(" ", "+"),
            "source": "YouTube",
            "description": f"Top YouTube videos on {t}.",
            "difficulty": "beginner",
        },
        {
            "type": "website",
            "title": f"Wikipedia — {t}",
            "url": "https://en.wikipedia.org/wiki/Special:Search?search=" + t.replace(" ", "+"),
            "source": "Wikipedia",
            "description": f"Encyclopedia overview of {t}.",
            "difficulty": "beginner",
        },
        {
            "type": "website",
            "title": "Khan Academy",
            "url": "https://www.khanacademy.org/search?page_search_query=" + t.replace(" ", "+"),
            "source": "Khan Academy",
            "description": "Free video lessons and exercises.",
            "difficulty": "beginner",
        },
        {
            "type": "website",
            "title": "freeCodeCamp",
            "url": "https://www.freecodecamp.org/learn/",
            "source": "freeCodeCamp",
            "description": "Free interactive courses.",
            "difficulty": "intermediate",
        },
        {
            "type": "course",
            "title": "MIT OpenCourseWare",
            "url": "https://ocw.mit.edu/search/?q=" + t.replace(" ", "+"),
            "source": "MIT OCW",
            "description": "University-level free courses.",
            "difficulty": "advanced",
        },
        {
            "type": "video",
            "title": "CrashCourse playlist",
            "url": "https://www.youtube.com/@crashcourse",
            "source": "YouTube · CrashCourse",
            "description": "Fast-paced educational videos.",
            "difficulty": "beginner",
        },
    ]


@router.post("")
def get_resources(
    payload: ResourceQuery,
    current_user: User = Depends(get_current_user),
):
    class_hint = ""
    if payload.class_name:
        level = payload.class_name.replace("_", " ")
        class_hint = (
            f"\nTarget audience: {level}. "
            f"Choose resources appropriate for this level — "
            f"don't suggest advanced university content for younger students."
        )

    user_msg = (
        f"Topic: {payload.topic}{class_hint}\n\n"
        f"Suggest 6-8 learning resources as JSON."
    )

    # ── Retry up to 3 times ──
    for attempt in range(3):
        try:
            result = chat_completion(
                messages=[
                    {"role": "system", "content": RESOURCE_SYSTEM},
                    {"role": "user", "content": user_msg},
                ],
                max_tokens=2000,
                temperature=0.3 if attempt == 0 else 0.5,
            )
            content = (
                result.get("content", "")
                if isinstance(result, dict)
                else str(result)
            )
            resources = _parse_resources(content)
            if resources:
                return {"topic": payload.topic, "resources": resources[:8]}
            print(f"[resources] attempt {attempt+1} returned no parseable resources")
        except Exception as e:
            print(f"[resources] attempt {attempt+1} failed: {e}")

    # ── Fallback if all attempts fail ──
    print(f"[resources] falling back to curated list for {payload.topic}")
    return {"topic": payload.topic, "resources": _fallback_resources(payload.topic)}