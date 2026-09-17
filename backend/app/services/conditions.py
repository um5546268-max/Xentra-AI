"""
Condition evaluator for automations.
Given a condition spec and a task result, decide whether to notify.
"""
from typing import Any


def _get_field(obj: Any, path: str) -> Any:
    """Get a nested field from a dict using a dot path."""
    if not path:
        return obj

    current = obj
    for part in path.split("."):
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
        if current is None:
            return None
    return current


def _as_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def _as_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        import re
        m = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
        if m:
            try:
                return float(m.group(0))
            except ValueError:
                return None
    return None


def evaluate_condition(condition: dict | None, result: dict) -> dict:
    """
    Evaluate a condition against a task result.
    Returns {"should_notify": bool, "reason": str, "matched": bool | None}.
    """
    if not condition:
        return {"should_notify": True, "reason": "no condition", "matched": True}

    ctype = (condition.get("type") or "always").lower()
    field = condition.get("field")
    expected = condition.get("value")

    if ctype == "always":
        return {"should_notify": True, "reason": "always", "matched": True}

    actual = _get_field(result, field) if field else result

    if ctype == "contains":
        actual_s = _as_string(actual).lower()
        expected_s = _as_string(expected).lower()
        matched = expected_s in actual_s
        return {
            "should_notify": matched,
            "reason": f"'{expected_s}' {'found' if matched else 'not found'} in result",
            "matched": matched,
        }

    if ctype == "not_contains":
        actual_s = _as_string(actual).lower()
        expected_s = _as_string(expected).lower()
        matched = expected_s not in actual_s
        return {
            "should_notify": matched,
            "reason": f"'{expected_s}' {'not ' if matched else ''}found in result",
            "matched": matched,
        }

    if ctype in ("greater_than", "less_than"):
        actual_n = _as_number(actual)
        expected_n = _as_number(expected)
        if actual_n is None or expected_n is None:
            return {
                "should_notify": False,
                "reason": f"could not parse numbers (actual={actual}, expected={expected})",
                "matched": None,
            }
        if ctype == "greater_than":
            matched = actual_n > expected_n
            reason = f"{actual_n} {'>' if matched else '<='} {expected_n}"
        else:
            matched = actual_n < expected_n
            reason = f"{actual_n} {'<' if matched else '>='} {expected_n}"
        return {"should_notify": matched, "reason": reason, "matched": matched}

    if ctype == "equals":
        matched = _as_string(actual).lower() == _as_string(expected).lower()
        return {
            "should_notify": matched,
            "reason": f"equality check: {matched}",
            "matched": matched,
        }

    return {"should_notify": True, "reason": f"unknown type '{ctype}'", "matched": True}