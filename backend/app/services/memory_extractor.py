"""
Auto-extract memories from chat exchanges.
Runs the LLM to detect: preferences, facts, projects, corrections.
"""
import json
import re
from app.services.ai import chat_completion


EXTRACTION_PROMPT = """You extract long-term facts about a user from a conversation exchange.

Read the exchange and identify any statements that reveal persistent information about the user:
- Their preferences (e.g. "I prefer Python")
- Personal facts (e.g. "I live in Karachi")
- Active projects (e.g. "I'm building a mobile app")
- Corrections to past assumptions (e.g. "I don't use Vue")
- Recurring workflows (e.g. "Every Monday I review metrics")

Rules:
1. Only extract DURABLE, LONG-TERM information. Not one-off questions.
2. Do NOT extract: greetings, general questions, jokes, or temporary context.
3. Do NOT extract anything the user didn't explicitly state.
4. If nothing is worth remembering, return an empty list.
5. Be conservative — better to miss than to store noise.

Output ONLY a JSON array of memories (empty array if none). No markdown, no explanation.

Schema for each memory:
{
  "kind": "preference" | "fact" | "project" | "workflow" | "correction",
  "key": "short label, max 60 chars",
  "value": "the memory content, max 300 chars",
  "importance": 1-10
}

Examples:

Exchange:
User: "I always use Python for data analysis. Never R."
Assistant: "Got it — Python it is."
Output:
[{"kind":"preference","key":"preferred data tool","value":"Prefers Python over R for data analysis","importance":8}]

Exchange:
User: "What's the weather today?"
Assistant: "I can't check live weather."
Output:
[]

Exchange:
User: "My name is Umair and I live in Karachi."
Assistant: "Nice to meet you, Umair."
Output:
[
  {"kind":"fact","key":"user name","value":"Umair","importance":9},
  {"kind":"fact","key":"user location","value":"Karachi","importance":8}
]

Exchange:
User: "I'm building an AI assistant called Xentra."
Assistant: "That sounds great."
Output:
[{"kind":"project","key":"current project","value":"Building an AI assistant called Xentra","importance":10}]
"""


def _strip_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw


def extract_memories(user_message: str, assistant_message: str) -> list[dict]:
    """
    Ask the LLM to extract durable memories from an exchange.
    Returns a list of memory dicts (may be empty).
    """
    if not user_message or len(user_message) < 8:
        return []

    # Quick pre-filter: only run extraction on messages that might contain memories
    lower = user_message.lower()
    hints = [
        "i prefer", "i like", "i love", "i hate", "i always", "i never",
        "my name", "i live", "i work", "i'm building", "i am building",
        "i'm working on", "i am working on", "i use", "i don't use",
        "my favorite", "my favourite", "remember", "note that",
        "i want you to", "please always", "please never",
    ]
    if not any(h in lower for h in hints):
        # No obvious memory signal — skip the LLM call to save cost
        return []

    try:
        result = chat_completion(
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Exchange:\n"
                        f"User: {user_message}\n"
                        f"Assistant: {assistant_message}\n\n"
                        f"Extract memories:"
                    ),
                },
            ],
            max_tokens=1000,
            temperature=0.1,
        )
    except Exception as e:
        print(f"[memory_extractor] AI call failed: {e}")
        return []

    raw = (result.get("content") or "").strip()
    raw = _strip_json(raw)

    # Find the JSON array
    match = re.search(r"\[[\s\S]*\]", raw)
    if not match:
        return []

    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []

    if not isinstance(data, list):
        return []

    # Validate each memory
    valid = []
    for m in data:
        if not isinstance(m, dict):
            continue
        kind = m.get("kind", "").lower()
        if kind not in ("preference", "fact", "project", "workflow", "correction"):
            continue
        key = (m.get("key") or "").strip()
        value = (m.get("value") or "").strip()
        if not key or not value or len(key) > 200 or len(value) > 2000:
            continue
        importance = m.get("importance", 5)
        try:
            importance = max(1, min(10, int(importance)))
        except (ValueError, TypeError):
            importance = 5

        valid.append({
            "kind": kind,
            "key": key,
            "value": value,
            "importance": importance,
        })

    return valid


def save_extracted_memories(
    db,
    user_id,
    conversation_id,
    memories: list[dict],
) -> int:
    """
    Save extracted memories to the DB, deduplicating by normalized key.
    Returns the number of new/updated memories.
    """
    from app.models.memory import Memory
    from sqlalchemy import select
    import re

    def normalize(k: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", k.lower()).strip()

    saved = 0
    for m in memories:
        normalized = normalize(m["key"])

        existing = db.execute(
            select(Memory)
            .where(Memory.user_id == user_id)
            .where(Memory.normalized_key == normalized)
            .where(Memory.active == True)  # noqa: E712
        ).scalar_one_or_none()

        if existing:
            # Only update if new importance is higher OR value differs meaningfully
            if m["importance"] > existing.importance or existing.value != m["value"]:
                existing.value = m["value"]
                existing.importance = max(existing.importance, m["importance"])
                # Don't downgrade a manual memory's source
                if existing.source != "manual":
                    existing.source = "auto"
                saved += 1
        else:
            db.add(Memory(
                user_id=user_id,
                kind=m["kind"],
                key=m["key"],
                value=m["value"],
                importance=m["importance"],
                source="auto",
                normalized_key=normalized,
                source_conversation_id=conversation_id,
            ))
            saved += 1

    if saved > 0:
        db.commit()

    return saved