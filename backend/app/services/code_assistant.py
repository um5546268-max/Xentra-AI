"""
AI-powered code helper — reads a file, applies an instruction, returns new content.
Uses the LLM. Does NOT write anything.
"""
import re
from app.services.ai import chat_completion
from app.services.code_agent import read_file


SYSTEM_PROMPT = """You are a senior software engineer.
You will receive a file's content and an instruction. Return the FULL NEW file content with the instruction applied.

Rules:
- Output ONLY the new file content. No markdown code fences. No explanations.
- Preserve the original language and formatting style.
- If the instruction can't be applied, return the file unchanged.
- If you're unsure about something, make a reasonable choice and comment it in the code.
- Never truncate the file.
"""


def apply_instruction(path: str, instruction: str) -> dict:
    """
    Read a file, apply an instruction via LLM, return new content (don't write).
    """
    file_data = read_file(path)
    original = file_data["content"]

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"FILE: {path}\n\n"
                f"INSTRUCTION: {instruction}\n\n"
                f"--- ORIGINAL FILE ---\n"
                f"{original}\n"
                f"--- END ---\n\n"
                f"Return the new file content:"
            ),
        },
    ]

    result = chat_completion(messages=messages, max_tokens=4000, temperature=0.2)
    new_content = (result.get("content") or "").strip()

    # Strip accidental code fences
    new_content = re.sub(r"^```[\w]*\n", "", new_content)
    new_content = re.sub(r"\n```$", "", new_content)

    return {
        "path": path,
        "instruction": instruction,
        "original": original,
        "new_content": new_content,
        "chars_changed": len(new_content) - len(original),
    }