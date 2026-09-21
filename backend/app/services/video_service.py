"""
Video generation service. Provider-agnostic.
Default provider: Wan 2.1 (open-source, runs via DashScope).
Optional providers: Sora 2 (OpenAI), Replicate.
"""
import os
import re
import time
import requests
from typing import Optional

from app.config import settings


# ═══════════════════════════════════════════════════════════════
# HELPERS — prompt composition
# ═══════════════════════════════════════════════════════════════
def _build_enriched_prompt(
    prompt: str,
    style: Optional[str] = None,
    camera_movement: Optional[str] = None,
    negative_prompt: Optional[str] = None,
    motion_strength: Optional[int] = None,
) -> str:
    """
    Compose a provider-agnostic prompt from the UI options.
    Not every provider supports every parameter, so we inline them into text.
    """
    parts = []

    if style:
        parts.append(f"{style} style")

    parts.append(prompt.strip().rstrip("."))

    if camera_movement:
        cam = camera_movement.replace("-", " ")
        parts.append(f"camera: {cam}")

    if motion_strength is not None:
        if motion_strength <= 3:
            parts.append("subtle motion")
        elif motion_strength >= 8:
            parts.append("dynamic, high motion")

    final = ". ".join(parts)

    if negative_prompt:
        final += f". Avoid: {negative_prompt.strip()}"

    return final


# ═══════════════════════════════════════════════════════════════
# PROVIDER: WAN 2.1 (Alibaba DashScope)
# ═══════════════════════════════════════════════════════════════
WAN_MODELS = {
    "turbo": "wan2.1-t2v-turbo",        # fastest, good quality
    "plus":  "wan2.1-t2v-plus",         # slower, better quality
    "i2v":   "wan2.1-i2v-turbo",        # image-to-video
}


def _wan_submit(prompt: str, **kwargs) -> dict:
    """
    Submit a Wan text-to-video (or image-to-video) job.
    Docs: https://help.aliyun.com/en/model-studio/
    """
    api_key = getattr(settings, "DASHSCOPE_API_KEY", "") or os.getenv(
        "DASHSCOPE_API_KEY", ""
    )
    if not api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is not configured")

    url = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis"

    # ── Compose the prompt with inline options ──
    final_prompt = _build_enriched_prompt(
        prompt=prompt,
        style=kwargs.get("style"),
        camera_movement=kwargs.get("camera_movement"),
        negative_prompt=kwargs.get("negative_prompt"),
        motion_strength=kwargs.get("motion_strength"),
    )

    # ── Model selection ──
    model = kwargs.get("model") or WAN_MODELS["turbo"]
    if kwargs.get("image_url"):
        model = WAN_MODELS["i2v"]

    # ═══════════════════════════════════════════════════════════
    # 👇 CAPABILITY CLAMPING — Wan 2.1 only supports 5s @ specific resolutions
    # ═══════════════════════════════════════════════════════════
    supported_durations = {
        "wan2.1-t2v-turbo": [5],
        "wan2.1-t2v-plus":  [5],
        "wan2.1-i2v-turbo": [5],
        "wan2.2-t2v-plus":  [5, 10],
    }

    allowed_durations = supported_durations.get(model, [5])
    requested_duration = kwargs.get("duration", 5)

    if requested_duration not in allowed_durations:
        # Pick the closest allowed duration
        picked_duration = min(
            allowed_durations,
            key=lambda d: abs(d - requested_duration)
        )
        print(
            f"[wan] duration {requested_duration}s not supported for {model}, "
            f"using {picked_duration}s instead"
        )
    else:
        picked_duration = requested_duration

    # ── Resolution support: Wan accepts "1280*720", "1920*1080", "832*480" etc.
    # We pass through but normalize to format Wan expects.
    size = kwargs.get("size", "1280*720")
    size = size.replace("x", "*")

    # ── Build parameters ──
    parameters = {
        "size": size,
        "duration": picked_duration,
        "prompt_extend": True,
    }

    # Note: Wan does NOT support seed, fps, or guidance_scale via the async API.
    # If they're set we ignore them silently.

    payload = {
        "model": model,
        "input": {"prompt": final_prompt},
        "parameters": parameters,
    }

    # Add image for image-to-video
    if kwargs.get("image_url"):
        payload["input"]["img_url"] = kwargs["image_url"]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }

    r = requests.post(url, json=payload, headers=headers, timeout=30)
    r.raise_for_status()
    data = r.json()

    if "output" not in data or "task_id" not in data["output"]:
        raise RuntimeError(f"Unexpected Wan response: {data}")

    return {
        "provider": "wan",
        "task_id": data["output"]["task_id"],
        "model": model,
    }


def _wan_status(task_id: str) -> dict:
    api_key = getattr(settings, "DASHSCOPE_API_KEY", "") or os.getenv(
        "DASHSCOPE_API_KEY", ""
    )
    url = f"https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}"

    headers = {"Authorization": f"Bearer {api_key}"}
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()

    out = data.get("output", {})
    status = out.get("task_status", "UNKNOWN").lower()

    result = {
        "status": "running",
        "progress": 0,
        "video_url": None,
        "error": None,
    }

    if status == "pending":
        result["status"] = "queued"
    elif status == "running":
        result["status"] = "running"
        result["progress"] = 50
    elif status == "succeeded":
        result["status"] = "done"
        result["progress"] = 100
        result["video_url"] = out.get("video_url")
    elif status in ("failed", "canceled"):
        result["status"] = "failed"
        result["error"] = out.get("message", f"Generation {status}")

    return result


# ═══════════════════════════════════════════════════════════════
# PROVIDER: SORA 2 (OpenAI) — optional, paid only
# ═══════════════════════════════════════════════════════════════
def _sora_submit(prompt: str, **kwargs) -> dict:
    """
    Sora 2 via OpenAI API.
    NOTE: Sora 2 API is being deprecated; check OpenAI docs for current availability.
    """
    api_key = getattr(settings, "OPENAI_API_KEY", "") or os.getenv(
        "OPENAI_API_KEY", ""
    )
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    final_prompt = _build_enriched_prompt(
        prompt=prompt,
        style=kwargs.get("style"),
        camera_movement=kwargs.get("camera_movement"),
        negative_prompt=kwargs.get("negative_prompt"),
        motion_strength=kwargs.get("motion_strength"),
    )

    model = kwargs.get("model") or "sora-2"
    size = kwargs.get("size", "1280x720").replace("*", "x")

    payload = {
        "model": model,
        "prompt": final_prompt,
        "seconds": kwargs.get("duration", 5),
        "size": size,
    }
    if kwargs.get("seed") is not None:
        payload["seed"] = kwargs["seed"]

    r = requests.post(
        "https://api.openai.com/v1/video/generations",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=60,
    )
    r.raise_for_status()
    data = r.json()
    return {
        "provider": "sora",
        "task_id": data["id"],
        "model": model,
    }


def _sora_status(task_id: str) -> dict:
    api_key = getattr(settings, "OPENAI_API_KEY", "") or os.getenv(
        "OPENAI_API_KEY", ""
    )
    r = requests.get(
        f"https://api.openai.com/v1/video/generations/{task_id}",
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()

    if data.get("status") == "succeeded":
        return {
            "status": "done",
            "progress": 100,
            "video_url": data["data"][0]["url"],
            "error": None,
        }
    if data.get("status") == "failed":
        return {
            "status": "failed",
            "progress": 0,
            "video_url": None,
            "error": data.get("error"),
        }
    return {
        "status": "running",
        "progress": 50,
        "video_url": None,
        "error": None,
    }


# ═══════════════════════════════════════════════════════════════
# PROVIDER: REPLICATE — optional
# ═══════════════════════════════════════════════════════════════
def _replicate_submit(prompt: str, **kwargs) -> dict:
    """Replicate — supports Wan 2.1, LTX-Video, and many others."""
    api_token = getattr(settings, "REPLICATE_API_TOKEN", "") or os.getenv(
        "REPLICATE_API_TOKEN", ""
    )
    if not api_token:
        raise RuntimeError("REPLICATE_API_TOKEN is not configured")

    # Replicate's Wan 2.1 endpoint
    model = kwargs.get("model") or "wan-video/wan-2.1"

    final_prompt = _build_enriched_prompt(
        prompt=prompt,
        style=kwargs.get("style"),
        camera_movement=kwargs.get("camera_movement"),
        negative_prompt=kwargs.get("negative_prompt"),
        motion_strength=kwargs.get("motion_strength"),
    )

    r = requests.post(
        "https://api.replicate.com/v1/predictions",
        headers={
            "Authorization": f"Token {api_token}",
            "Content-Type": "application/json",
        },
        json={
            "version": model,
            "input": {
                "prompt": final_prompt,
                "num_frames": kwargs.get("duration", 5) * kwargs.get("fps", 24),
                "fps": kwargs.get("fps", 24),
            },
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    return {
        "provider": "replicate",
        "task_id": data["id"],
        "model": model,
    }


def _replicate_status(task_id: str) -> dict:
    api_token = getattr(settings, "REPLICATE_API_TOKEN", "") or os.getenv(
        "REPLICATE_API_TOKEN", ""
    )
    r = requests.get(
        f"https://api.replicate.com/v1/predictions/{task_id}",
        headers={"Authorization": f"Token {api_token}"},
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()

    status = data.get("status")
    if status == "succeeded":
        output = data.get("output")
        video_url = output if isinstance(output, str) else (output or [None])[0]
        return {
            "status": "done",
            "progress": 100,
            "video_url": video_url,
            "error": None,
        }
    if status in ("failed", "canceled"):
        return {
            "status": "failed",
            "progress": 0,
            "video_url": None,
            "error": data.get("error", f"Generation {status}"),
        }
    return {
        "status": "running",
        "progress": 50,
        "video_url": None,
        "error": None,
    }


# ═══════════════════════════════════════════════════════════════
# PROVIDER REGISTRY
# ═══════════════════════════════════════════════════════════════
PROVIDERS = {
    "wan": {
        "submit": _wan_submit,
        "status": _wan_status,
        "label": "Wan 2.1",
    },
    "sora": {
        "submit": _sora_submit,
        "status": _sora_status,
        "label": "Sora 2",
    },
    "replicate": {
        "submit": _replicate_submit,
        "status": _replicate_status,
        "label": "Replicate",
    },
}


def _has_key(provider: str) -> bool:
    if provider == "wan":
        return bool(
            getattr(settings, "DASHSCOPE_API_KEY", "")
            or os.getenv("DASHSCOPE_API_KEY")
        )
    if provider == "sora":
        return bool(
            getattr(settings, "OPENAI_API_KEY", "")
            or os.getenv("OPENAI_API_KEY")
        )
    if provider == "replicate":
        return bool(
            getattr(settings, "REPLICATE_API_TOKEN", "")
            or os.getenv("REPLICATE_API_TOKEN")
        )
    return False


def get_available_providers() -> list[dict]:
    result = []
    for key, meta in PROVIDERS.items():
        result.append({
            "key": key,
            "label": meta["label"],
            "available": _has_key(key),
        })
    return result


def submit_video(provider: str, prompt: str, **kwargs) -> dict:
    meta = PROVIDERS.get(provider)
    if not meta:
        raise ValueError(f"Unknown provider: {provider}")
    return meta["submit"](prompt, **kwargs)


def check_status(provider: str, task_id: str) -> dict:
    meta = PROVIDERS.get(provider)
    if not meta:
        raise ValueError(f"Unknown provider: {provider}")
    return meta["status"](task_id)


# ═══════════════════════════════════════════════════════════════
# VIDEO INTENT DETECTION (used by chat)
# ═══════════════════════════════════════════════════════════════
def extract_video_intent(text: str) -> Optional[dict]:
    """Detect if a chat message is asking for video generation."""
    lower = text.lower().strip()

    video_triggers = [
        "generate a video",
        "make a video",
        "create a video",
        "generate video",
        "make video",
        "create video",
        "video of",
        "animate",
        "animation of",
        "text to video",
    ]
    if not any(t in lower for t in video_triggers):
        return None

    # Extract duration if mentioned (e.g. "5 second video")
    duration = 5
    m = re.search(r"(\d+)\s*(second|sec|s)\s+video", lower)
    if m:
        duration = min(int(m.group(1)), 20)

    return {
        "prompt": text.strip(),
        "duration": duration,
    }