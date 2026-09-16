"""
Image generation service — currently uses Pollinations.ai (free, no key).
Designed so we can swap providers later without touching routes/frontend.
"""
import re
import random
from urllib.parse import quote


DEFAULT_WIDTH = 1024
DEFAULT_HEIGHT = 1024
DEFAULT_MODEL = "flux"


def _enhance_prompt(prompt: str) -> str:
    prompt = prompt.strip()
    quality_keywords = ["4k", "8k", "hd", "high quality", "detailed",
                        "photorealistic", "cinematic", "masterpiece"]
    if not any(k in prompt.lower() for k in quality_keywords):
        prompt += ", high quality, detailed"
    return prompt


def generate_image_url(
    prompt: str,
    width: int = DEFAULT_WIDTH,
    height: int = DEFAULT_HEIGHT,
    model: str = DEFAULT_MODEL,
    seed: int | None = None,
    enhance: bool = True,
) -> dict:
    if not prompt or not prompt.strip():
        raise ValueError("Prompt is required")

    width = max(256, min(int(width), 2048))
    height = max(256, min(int(height), 2048))

    original = prompt.strip()
    final_prompt = _enhance_prompt(original) if enhance else original

    if seed is None:
        seed = random.randint(1, 2_147_483_647)

    encoded = quote(final_prompt, safe="")

    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={width}&height={height}"
        f"&model={model}&seed={seed}&nologo=true"
    )

    return {
        "prompt": original,
        "enhanced_prompt": final_prompt,
        "provider": "pollinations",
        "model": model,
        "width": width,
        "height": height,
        "seed": seed,
        "image_url": url,
    }


def extract_image_intent(message: str) -> dict | None:
    """Detect if a chat message is asking to generate an image."""
    if not message:
        return None

    msg = message.strip()
    lower = msg.lower()

    triggers = [
        "generate an image", "generate a image", "create an image",
        "make an image", "draw me", "draw a", "draw an",
        "paint me", "paint a", "paint an",
        "create a picture", "generate a picture", "make a picture",
        "generate a photo", "create a photo",
        "image of", "picture of",
        "show me a picture", "show me an image",
        "illustrate",
    ]

    matched = None
    for t in triggers:
        idx = lower.find(t)
        if idx != -1:
            matched = (idx, t)
            break

    if not matched:
        return None

    idx, trigger = matched
    prompt = msg[idx + len(trigger):].strip()
    prompt = re.sub(r"^(of|:|\-|\s)+", "", prompt, flags=re.IGNORECASE).strip()

    if len(prompt) < 3:
        return None

    return {"prompt": prompt}