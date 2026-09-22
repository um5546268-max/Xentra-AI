"""
Xentra Mind Map — generate a concept graph from study material.
"""
import json
import re
from typing import Any

from fastapi import HTTPException

from app.services.ai import chat_completion


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
    raise HTTPException(500, f"Invalid JSON from model: {raw[:300]}")


MINDMAP_SYSTEM = """You are a JSON generator. Output ONLY raw JSON.

Given a topic and its concepts, build a mind map as a graph.

Schema (strict):
{
  "nodes": [
    {
      "id": "short_unique_id",
      "label": "concept name (2-5 words)",
      "description": "one clear sentence",
      "level": 0,
      "parent": null
    }
  ],
  "edges": [
    { "id": "e1", "source": "parent_id", "target": "child_id", "label": "relation" }
  ]
}

Rules:
- Exactly ONE root node (level 0, parent null)
- All other nodes are children or grandchildren (level 1 or 2)
- 8-14 nodes total
- 8-14 edges connecting parent → child
- Every non-root node has exactly one edge to its parent
- Node ids must be lowercase_with_underscores
- Edge ids: e1, e2, e3...
- Every node has a "level": 0, 1, or 2
- Keep labels short (2-5 words)
- Keep descriptions to one sentence

Start with { and end with }. Nothing else."""


def generate_mindmap(topic: str, concepts: list[dict]) -> dict:
    """Generate a mind map graph from a topic + concepts."""
    # Keep the payload small
    concepts_small = [
        {
            "concept": c.get("concept", "")[:80],
            "definition": c.get("definition", "")[:120],
        }
        for c in concepts[:10]
    ]

    user_msg = json.dumps({
        "topic": topic,
        "concepts": concepts_small,
    }, indent=2)

    result = chat_completion(
        messages=[
            {"role": "system", "content": MINDMAP_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=2500,
        temperature=0.5,
    )
    content = result.get("content", "") if isinstance(result, dict) else str(result)
    data = _safe_json(content)

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    # Validation
    if len(nodes) < 4:
        raise HTTPException(500, f"Mind map too small: {len(nodes)} nodes")

    # Ensure every node has required fields
    cleaned_nodes = []
    for n in nodes:
        if not n.get("id") or not n.get("label"):
            continue
        cleaned_nodes.append({
            "id": str(n["id"])[:40],
            "label": str(n["label"])[:60],
            "description": str(n.get("description", ""))[:200],
            "level": int(n.get("level", 1)),
            "parent": n.get("parent"),
        })

    # Ensure edges reference existing nodes
    node_ids = {n["id"] for n in cleaned_nodes}
    cleaned_edges = []
    for e in edges:
        if e.get("source") in node_ids and e.get("target") in node_ids:
            cleaned_edges.append({
                "id": str(e.get("id", f"e{len(cleaned_edges)+1}")),
                "source": e["source"],
                "target": e["target"],
                "label": str(e.get("label", ""))[:30] if e.get("label") else None,
            })

    return {"nodes": cleaned_nodes, "edges": cleaned_edges}