"""
Xentra Learn — generates flashcards, quizzes, and concept maps via Groq.
"""
import json
import random
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
        model="llama-3.1-8b-instant",
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
# Prompt 3 — Quiz (10 questions, shuffled answers)
# ─────────────────────────────────────────────────────────────
QUIZ_SYSTEM = """You are a JSON generator. You ONLY output raw JSON. Never explain. Never narrate.

Create 10 multiple-choice questions from the given concepts and flashcards.

Output schema (strict — no extra fields, no markdown, no explanation outside the JSON):
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_index": 0,
      "explanation": "string"
    }
  ]
}

Rules:
- Exactly 10 items in the "questions" array
- Each question has exactly 4 options
- correct_index is 0, 1, 2, or 3
- Vary correct_index across the 10 questions — do NOT always use 0
- Wrong options must be plausible
- Keep each question under 20 words
- Keep each explanation under 25 words

Start your response with { and end with }. Nothing else."""


def _shuffle_question(q: dict) -> dict:
    """Shuffle a question's options and update correct_index accordingly."""
    options = q.get("options", [])
    ci = q.get("correct_index", 0)
    if not options or not isinstance(ci, int) or ci < 0 or ci >= len(options):
        return q
    correct_text = options[ci]
    shuffled = list(options)
    random.shuffle(shuffled)
    q["options"] = shuffled
    q["correct_index"] = shuffled.index(correct_text)
    return q


def generate_quiz(concepts: list[dict], flashcards: list[dict]) -> list[dict]:
    """Generate a quiz — 10 questions, options shuffled, position bias removed."""
    # Keep the payload SHORT so the model has room to output
    small_concepts = [
        {"concept": c.get("concept", ""), "definition": c.get("definition", "")[:120]}
        for c in concepts[:8]
    ]
    small_cards = [
        {"question": f.get("question", "")[:80], "answer": f.get("answer", "")[:120]}
        for f in flashcards[:8]
    ]
    payload = json.dumps(
        {"concepts": small_concepts, "flashcards": small_cards},
        indent=2,
    )

    result = chat_completion(
        messages=[
            {"role": "system", "content": QUIZ_SYSTEM},
            {"role": "user", "content": payload},
        ],
        model="llama-3.1-8b-instant",
        max_tokens=4000,
        temperature=0.6,
    )
    content = result.get("content", "") if isinstance(result, dict) else str(result)
    data = _safe_json(content)
    questions = data.get("questions", [])

    if not questions:
        raise HTTPException(500, "No quiz questions returned")

    cleaned = []
    for q in questions[:10]:
        if not isinstance(q, dict):
            continue
        if not all(k in q for k in ("question", "options", "correct_index", "explanation")):
            continue
        opts = q.get("options", [])
        if not isinstance(opts, list) or len(opts) != 4:
            continue
        ci = q.get("correct_index")
        if not isinstance(ci, int) or ci < 0 or ci > 3:
            continue
        q = _shuffle_question(q)
        cleaned.append(q)

    if len(cleaned) < 5:
        raise HTTPException(
            500,
            f"Only {len(cleaned)} valid quiz questions generated (need at least 5)",
        )

    return cleaned


# ─────────────────────────────────────────────────────────────
# SM-2 spaced repetition
# ─────────────────────────────────────────────────────────────
def apply_sm2(
    repetitions: int,
    ease_factor: float,
    interval_days: int,
    quality: int,
) -> tuple[int, float, int]:
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