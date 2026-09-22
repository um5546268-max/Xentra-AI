"""
Xentra Notes AI — summarization, simplification, and note-to-Learn conversion.
"""
from fastapi import HTTPException

from app.services.ai import chat_completion


# ─────────────────────────────────────────────────────────────
# Summarize a note
# ─────────────────────────────────────────────────────────────
SUMMARIZE_SYSTEM = """You are a concise summarizer. Given a note, produce a 2-3 sentence summary that captures the key ideas.

Rules:
- Plain text only, no markdown
- Under 60 words
- Skip greetings and meta-commentary
- Focus on what matters

Return ONLY the summary text."""


def summarize_note(title: str, body: str) -> str:
    if not body.strip():
        raise HTTPException(400, "Note is empty")
    result = chat_completion(
        messages=[
            {"role": "system", "content": SUMMARIZE_SYSTEM},
            {"role": "user", "content": f"Title: {title}\n\n{body[:6000]}"},
        ],
        max_tokens=200,
        temperature=0.3,
    )
    content = result.get("content", "") if isinstance(result, dict) else str(result)
    return content.strip()


# ─────────────────────────────────────────────────────────────
# Explain in simple words
# ─────────────────────────────────────────────────────────────
EXPLAIN_SYSTEM = """You are a brilliant teacher explaining to a curious 12-year-old.

Rewrite the given note in very simple, everyday words. Use short sentences. Use analogies where helpful. Keep every important idea.

Rules:
- Plain text, no markdown
- Under 400 words
- Short sentences
- Conversational tone
- Preserve all key facts

Return ONLY the rewritten text."""


def explain_simply(title: str, body: str) -> str:
    if not body.strip():
        raise HTTPException(400, "Note is empty")
    result = chat_completion(
        messages=[
            {"role": "system", "content": EXPLAIN_SYSTEM},
            {"role": "user", "content": f"Title: {title}\n\n{body[:6000]}"},
        ],
        max_tokens=800,
        temperature=0.5,
    )
    content = result.get("content", "") if isinstance(result, dict) else str(result)
    return content.strip()