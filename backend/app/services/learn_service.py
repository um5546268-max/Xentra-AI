"""
Xentra Learn — generates flashcards, quizzes, and concept maps via Groq.
"""
import json
import re
from typing import Any

from fastapi import HTTPException

from app.services.ai import chat_completion
from app.config import settings


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def _strip_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


def _safe_json(raw: str) -> Any:
    cleaned = _strip_json(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        for opener, closer in [("{", "}"), ("[", "]")]:
            start = cleaned.find(opener)
            end = cleaned.rfind(closer)
            if start >= 0 and end > start:
                try:
                    return json.loads(cleaned[start:end + 1])
                except json.JSONDecodeError:
                    continue
    raise HTTPException(500, f"Model returned invalid JSON: {raw[:300]}")


def _call_llm(system: str, user: str, max_tokens: int, temperature: float) -> Any:
    """Wrapper around chat_completion that extracts text and parses JSON."""
    result = chat_completion(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    content = result.get("content", "") if isinstance(result, dict) else str(result)
    return _safe_json(content)


# ─────────────────────────────────────────────────────────────
# Prompt 1 — Extract concepts
# ─────────────────────────────────────────────────────────────
CONCEPT_SYSTEM = """You are an expert teacher. Given study material or a topic, extract the most important concepts a student must understand.

Return ONLY valid JSON. No markdown, no explanation.

Schema:
{
  "summary": "3-4 sentence overview",
  "concepts": [
    {
      "concept": "short name",
      "definition": "one clear sentence",
      "importance": 1-10,
      "prerequisites": ["other concept names"]
    }
  ]
}"""


def extract_concepts(topic: str | None, text: str | None, num: int = 8) -> dict:
    if topic:
        user = f"Topic: {topic}\n\nExtract {num} key concepts."
    else:
        user = f"Study material:\n\n{text[:8000]}\n\nExtract {num} key concepts."

    data = _call_llm(CONCEPT_SYSTEM, user, max_tokens=2000, temperature=0.3)
    if "concepts" not in data:
        raise HTTPException(500, "No concepts returned")
    return data


# ─────────────────────────────────────────────────────────────
# Prompt 2 — Flashcards
# ─────────────────────────────────────────────────────────────
FLASHCARD_SYSTEM = """You are an expert teacher creating flashcards for spaced-repetition study.

Given a list of concepts, produce 10-15 flashcards. Each card tests ONE idea.

Return ONLY valid JSON. Schema:
{
  "flashcards": [
    {
      "concept": "which concept this tests",
      "question": "clear, specific question",
      "answer": "concise answer (1-3 sentences)",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Rules:
- Questions must be answerable from the concepts alone
- Avoid yes/no questions
- Mix recall, application, and compare/contrast
- Difficulty distribution: ~30% easy, 50% medium, 20% hard"""


def generate_flashcards(concepts: list[dict]) -> list[dict]:
    payload = json.dumps(concepts, indent=2)
    data = _call_llm(FLASHCARD_SYSTEM, f"Concepts:\n{payload}", max_tokens=3000, temperature=0.4)
    cards = data.get("flashcards", [])
    if not cards:
        raise HTTPException(500, "No flashcards returned")
    return cards


# ─────────────────────────────────────────────────────────────
# Prompt 3 — Quiz
# ─────────────────────────────────────────────────────────────
QUIZ_SYSTEM = """You are an expert teacher. Create a 5-question multiple-choice quiz based on these concepts and flashcards.

Return ONLY valid JSON. Schema:
{
  "questions": [
    {
      "question": "clear question",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "why this answer is correct"
    }
  ]
}

Rules:
- 4 options per question
- Only ONE correct answer
- Wrong answers must be plausible
- Mix recall, application, and analysis
- correct_index is 0-based"""


def generate_quiz(concepts: list[dict], flashcards: list[dict]) -> list[dict]:
    payload = json.dumps({"concepts": concepts, "flashcards": flashcards}, indent=2)
    data = _call_llm(QUIZ_SYSTEM, payload, max_tokens=2500, temperature=0.4)
    questions = data.get("questions", [])
    if not questions:
        raise HTTPException(500, "No quiz questions returned")
    return questions


# ─────────────────────────────────────────────────────────────
# SM-2 spaced repetition
# ─────────────────────────────────────────────────────────────
def apply_sm2(repetitions: int, ease_factor: float, interval_days: int, quality: int) -> tuple[int, float, int]:
    if quality < 3:
        return 0, ease_factor, 1
    if repetitions == 0:
        interval = 1
    elif repetitions == 1:
        interval = 6
    else:
        interval = round(interval_days * ease_factor)
    new_ef = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ef = max(1.3, new_ef)
    return repetitions + 1, new_ef, interval