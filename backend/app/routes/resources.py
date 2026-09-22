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
    kind: str = "mixed"  # mixed | videos | websites | pdfs


RESOURCE_SYSTEM = """You are a JSON generator. Output ONLY raw JSON.

Given a topic, suggest 6-8 high-quality learning resources — real, well-known, and useful.

Schema:
{
  "resources": [
    {
      "type": "video" | "website" | "pdf" | "course",
      "title": "short descriptive title",
      "url": "real URL",
      "source": "YouTube | Khan Academy | MDN | freeCodeCamp | etc.",
      "description": "one sentence about what this covers",
      "difficulty": "beginner" | "intermediate" | "advanced"
    }
  ]
}

Rules:
- Only suggest resources you're confident EXIST (well-known channels, official docs, established platforms)
- Prefer: Khan Academy, freeCodeCamp, MDN, YouTube educational channels (CrashCourse, 3Blue1Brown, CS50, etc.), official docs, Wikipedia, Project Gutenberg for older texts
- Mix types: 2-3 videos, 2-3 websites, 1-2 PDFs/courses
- Every URL must be a real, well-known URL (e.g. https://www.youtube.com/@crashcourse)
- Do NOT invent URLs
- Return exactly 6-8 items
- Start your response with { and end with }

Never include markdown. Never include explanations outside the JSON."""


def _strip_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


@router.post("")
def get_resources(
    payload: ResourceQuery,
    current_user: User = Depends(get_current_user),
):
    class_hint = f" for {payload.class_name.replace('_', ' ')}" if payload.class_name else ""
    user_msg = f"Topic: {payload.topic}{class_hint}\n\nSuggest 6-8 learning resources."

    result = chat_completion(
        messages=[
            {"role": "system", "content": RESOURCE_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=2000,
        temperature=0.5,
    )
    content = result.get("content", "") if isinstance(result, dict) else str(result)
    try:
        data = json.loads(_strip_json(content))
    except json.JSONDecodeError:
        # Fallback: find first { ... }
        cleaned = _strip_json(content)
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            data = json.loads(cleaned[start:end + 1])
        else:
            raise HTTPException(500, "Invalid JSON from model")

    resources = data.get("resources", [])
    # Validate each has required fields
    cleaned = [
        r for r in resources
        if isinstance(r, dict)
        and r.get("title")
        and r.get("url")
        and r.get("type") in ("video", "website", "pdf", "course")
    ]
    return {"topic": payload.topic, "resources": cleaned[:8]}