"""
Xentra Learn — generates flashcards, quizzes, and concept maps via Groq.
"""
import json
import re
from typing import Any
import random

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
QUIZ_SYSTEM = """You are an expert teacher creating a comprehensive multiple-choice quiz.

Create EXACTLY 10 questions based on the given concepts and flashcards.

Return ONLY valid JSON. Schema:
{
  "questions": [
    {
      "question": "clear question",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "why this answer is correct (1-2 sentences)",
      "difficulty": "easy" | "medium" | "hard",
      "type": "recall" | "application" | "comparison" | "analysis"
    }
  ]
}

STRICT RULES:
- EXACTLY 10 questions — no fewer, no more
- 4 options per question
- Only ONE correct answer per question
- Wrong answers must be plausible (not obviously silly)
- Vary difficulty: 3 easy, 5 medium, 2 hard
- Vary types across questions:
  - recall: definitions, facts, terms
  - application: use in a scenario
  - comparison: differences, similarities
  - analysis: cause/effect, reasoning
- correct_index is 0-based (0, 1, 2, or 3)
- Every question must include a short explanation
- CRITICAL: Distribute correct answers evenly across positions A, B, C, D.
  Do NOT make A the correct answer more than 3 times out of 10.

Do NOT return fewer than 10 questions. Do NOT include markdown code fences."""


def _shuffle_question(q: dict) -> dict:
    """
    Take a quiz question and shuffle its options while keeping correct_index accurate.
    This eliminates LLM positional bias (Groq tends to put the answer first).
    """
    options = q.get("options", [])
    correct_index = q.get("correct_index", 0)
    if not options or correct_index is None or correct_index >= len(options):
        return q

    # Pair each option with whether it's correct
    correct_text = options[correct_index]
    shuffled = list(options)
    random.shuffle(shuffled)

    # Find the new position of the correct answer
    new_index = shuffled.index(correct_text)

    q["options"] = shuffled
    q["correct_index"] = new_index
    return q


def generate_quiz(concepts: list[dict], flashcards: list[dict]) -> list[dict]:
    """Generate a 10-question quiz and randomize answer positions."""
    payload = json.dumps(
        {
            "concepts": concepts,
            "flashcards": flashcards,
            "required_question_count": 10,
        },
        indent=2,
    )

    def _attempt(strict: bool) -> list[dict]:
        system = QUIZ_SYSTEM
        if strict:
            system += (
                "\n\nIMPORTANT: Return exactly 10 questions. "
                "Vary the position of the correct answer — do NOT put it always as A. "
                "Distribute correct answers roughly evenly across A, B, C, D."
            )
        result = chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": payload},
            ],
            max_tokens=4500,
            temperature=0.8,
        )
        content = result.get("content", "") if isinstance(result, dict) else str(result)
        data = _safe_json(content)
        return data.get("questions", [])

    questions = _attempt(strict=False)
    if len(questions) < 8:
        questions = _attempt(strict=True)

    if not questions:
        raise HTTPException(500, "No quiz questions returned")

    # Clean + validate
    cleaned = []
    for q in questions[:10]:
        if not all(k in q for k in ("question", "options", "correct_index", "explanation")):
            continue
        if len(q.get("options", [])) != 4:
            continue
        ci = q.get("correct_index", 0)
        if not isinstance(ci, int) or ci < 0 or ci > 3:
            continue
        # ⭐ Shuffle the options so the correct answer isn't always A
        q = _shuffle_question(q)
        cleaned.append(q)

    if len(cleaned) < 5:
        raise HTTPException(500, f"Quiz too short after validation: {len(cleaned)} valid questions")

    return cleaned


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