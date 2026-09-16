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
    Save extracted memories to the DB with fuzzy deduplication.
    Returns the number of new/updated memories.
    """
    from app.models.memory import Memory
    from sqlalchemy import select
    import re

    def normalize(k: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", k.lower()).strip()

    def keywords(text: str, min_len: int = 4) -> set[str]:
        words = re.findall(r"\b[a-z0-9]+\b", text.lower())
        return {w for w in words if len(w) >= min_len}

    # Load all existing memories for this user
    existing_all = db.execute(
        select(Memory)
        .where(Memory.user_id == user_id)
        .where(Memory.active == True)  # noqa: E712
    ).scalars().all()

    saved = 0

    for m in memories:
        normalized = normalize(m["key"])
        new_keywords = keywords(f"{m['key']} {m['value']}")

        # Find best match: exact key OR high keyword overlap
        best_match: Memory | None = None
        best_score = 0.0

        for existing in existing_all:
            # Exact normalized key match → perfect
            if existing.normalized_key == normalized:
                best_match = existing
                best_score = 1.0
                break

            # Fuzzy: keyword overlap
            existing_keywords = keywords(f"{existing.key} {existing.value}")
            if not existing_keywords or not new_keywords:
                continue

            overlap = len(new_keywords & existing_keywords)
            total = len(new_keywords | existing_keywords)
            similarity = overlap / total if total > 0 else 0

            # Also check kind match
            if existing.kind == m["kind"] and similarity > best_score:
                best_score = similarity
                best_match = existing

        # Decision thresholds
        # > 0.65 similarity → update
        # 0.4 - 0.65 → skip (ambiguous, don't duplicate)
        # < 0.4 → new memory

        if best_match and best_score >= 0.65:
            # Update existing
            if m["importance"] > best_match.importance or best_match.value != m["value"]:
                best_match.value = m["value"]
                best_match.importance = max(best_match.importance, m["importance"])
                if best_match.source != "manual":
                    best_match.source = "auto"
                saved += 1
        elif best_match and best_score >= 0.4:
            # Too similar but not confident — skip to avoid duplication
            print(f"[memory] Skipped near-duplicate: '{m['key']}' (similarity {best_score:.2f})")
        else:
            # New memory
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
def _tokenize(text: str) -> list[str]:
    """Extract meaningful words from a query."""
    import re
    words = re.findall(r"\b[a-z0-9]+\b", text.lower())
    stop = {
        "the", "and", "for", "with", "that", "this", "from", "have",
        "has", "are", "was", "were", "been", "what", "when", "where",
        "which", "who", "why", "how", "any", "all", "some", "each",
        "you", "your", "can", "will", "would", "could", "should",
    }
    return [w for w in words if len(w) >= 3 and w not in stop]


def load_relevant_memories(
    db,
    user_id,
    query: str | None = None,
    max_chars: int = 3000,
) -> list[dict]:
    """
    Load memories relevant to a query.
    Always includes: pinned + importance >= 8
    Adds keyword-matched ones up to the char budget.

    Returns a list of {kind, key, value, importance, pinned}.
    """
    from app.models.memory import Memory
    from sqlalchemy import select

    stmt = (
        select(Memory)
        .where(Memory.user_id == user_id)
        .where(Memory.active == True)  # noqa: E712
        .order_by(
            Memory.pinned.desc(),
            Memory.importance.desc(),
            Memory.updated_at.desc(),
        )
    )
    all_memories = db.execute(stmt).scalars().all()

    if not all_memories:
        return []

    # Always include pinned and high-importance
    must_include = [
        m for m in all_memories
        if m.pinned or m.importance >= 8
    ]

    # Optional: keyword-matched extras
    optional = []
    if query:
        query_words = _tokenize(query)
        if query_words:
            for m in all_memories:
                if m in must_include:
                    continue
                haystack = f"{m.key} {m.value}".lower()
                if any(w in haystack for w in query_words):
                    optional.append(m)

    # Combine (dedup)
    seen_ids = set()
    combined = []
    for m in must_include + optional:
        if m.id in seen_ids:
            continue
        seen_ids.add(m.id)
        combined.append(m)

    # Trim to fit char budget
    result = []
    used = 0
    for m in combined:
        line = f"[{m.kind}] {m.key}: {m.value}"
        if used + len(line) > max_chars:
            break
        result.append({
            "id": str(m.id),
            "kind": m.kind,
            "key": m.key,
            "value": m.value,
            "importance": m.importance,
            "pinned": m.pinned,
        })
        used += len(line) + 1

    return result


def format_memories_for_prompt(memories: list[dict]) -> str:
    """
    Format a list of memory dicts into a prompt block.
    """
    if not memories:
        return ""

    lines = [
        "=== WHAT I KNOW ABOUT THE USER ===",
        "These are long-term facts and preferences about the user.",
        "Honor them in your response. Do NOT explicitly mention that you're using memories unless asked.",
        "",
    ]
    for m in memories:
        lines.append(f"- [{m['kind']}] {m['key']}: {m['value']}")
    lines.append("=== END MEMORY ===")

    return "\n".join(lines)