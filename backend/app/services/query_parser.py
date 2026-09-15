"""
Parse a natural language shopping query into structured intent.
Uses the LLM (Groq) to extract product_type, budget, use_case, etc.
"""
import json
import re
from app.services.ai import chat_completion


SYSTEM_PROMPT = """You parse shopping queries into structured JSON.

Return ONLY a JSON object with these fields:
{
  "product_type": "laptop" | "phone" | "headphones" | "tablet" | "monitor" | "keyboard" | ...,
  "budget_max": number | null,
  "budget_min": number | null,
  "currency": "PKR" | "USD" | "INR" | "EUR" | "GBP",
  "use_case": "university" | "gaming" | "work" | "photography" | "general" | ...,
  "priority_features": ["battery", "portability", ...],
  "country": "PK" | "IN" | "US" | "UK" | "global"
}

Rules:
- If no budget mentioned, budget_max = null.
- Detect currency from symbols: Rs / PKR → PKR, $ → USD, ₹ → INR, € → EUR, £ → GBP.
- If user is in Pakistan (default for us), country = "PK".
- Extract use case from words like "for university", "for gaming", "for work".
- priority_features: infer from use case (university → battery, portability, weight).
- Output ONLY JSON. No markdown, no explanation.

Examples:
Input: "best laptop under 100000 for university"
Output: {"product_type":"laptop","budget_max":100000,"budget_min":null,"currency":"PKR","use_case":"university","priority_features":["battery","portability","performance"],"country":"PK"}

Input: "wireless headphones under $200 for running"
Output: {"product_type":"headphones","budget_max":200,"budget_min":null,"currency":"USD","use_case":"sports","priority_features":["battery","water resistance","comfort"],"country":"US"}
"""


def parse_shopping_query(user_query: str) -> dict:
    """
    Return structured shopping intent.
    Falls back to a minimal structure if the LLM fails.
    """
    try:
        result = chat_completion(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query},
            ],
            max_tokens=1500,
            temperature=0.1,
        )
    except Exception as e:
        print(f"[query_parser] AI error: {e}")
        return _fallback(user_query)

    raw = (result.get("content") or "").strip()
    print(f"[query_parser] Raw LLM output: {raw[:300]}")

    # Strip markdown fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    # Find JSON object
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        print(f"[query_parser] No JSON found in: {raw[:200]}")
        return _fallback(user_query)

    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as e:
        print(f"[query_parser] JSON decode error: {e}")
        return _fallback(user_query)

    # Validate/normalize
    return {
        "product_type": data.get("product_type") or "product",
        "budget_max": data.get("budget_max"),
        "budget_min": data.get("budget_min"),
        "currency": (data.get("currency") or "PKR").strip(),
        "use_case": data.get("use_case") or "general",
        "priority_features": data.get("priority_features") or [],
        "country": data.get("country") or "PK",
    }

    # Validate/normalize
    return {
        "product_type": data.get("product_type") or "product",
        "budget_max": data.get("budget_max"),
        "budget_min": data.get("budget_min"),
        "currency": (data.get("currency") or "PKR").strip(),
        "use_case": data.get("use_case") or "general",
        "priority_features": data.get("priority_features") or [],
        "country": data.get("country") or "PK",
    }


def _fallback(query: str) -> dict:
    """Minimal fallback if AI parsing fails."""
    # Try to extract a number from the query
    budget = None
    m = re.search(r"(\d{4,})", query.replace(",", ""))
    if m:
        try:
            budget = float(m.group(1))
        except ValueError:
            pass

    return {
        "product_type": "product",
        "budget_max": budget,
        "budget_min": None,
        "currency": "PKR",
        "use_case": "general",
        "priority_features": [],
        "country": "PK",
    }