"""
Voice service — speech-to-text via Groq Whisper.
Text-to-speech is handled client-side by the browser.
"""
import io
from groq import Groq
from fastapi import HTTPException

from app.config import settings


_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set")
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


WHISPER_MODEL = "whisper-large-v3"


def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str | None = None,
    prompt: str | None = None,
) -> dict:
    """
    Transcribe audio using Groq's Whisper model.
    Returns {"text": str, "language": str | None, "duration": float | None}.
    """
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")
        # Validate language — accept only known ISO codes
    if language:
        language = language.strip().lower()
        # Only 2-letter codes are valid for Whisper
        if len(language) != 2 or not language.isalpha():
            language = None

    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Audio too large (max 25 MB)",
        )

    client = get_client()

    # Groq SDK accepts a file-like object with a name attribute
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    try:
        response = client.audio.transcriptions.create(
            file=audio_file,
            model=WHISPER_MODEL,
            language=language,
            prompt=prompt,
            response_format="verbose_json",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Transcription failed: {str(e)[:300]}",
        )

    # Groq returns a dict-like object
    text = getattr(response, "text", None) or ""
    detected_lang = getattr(response, "language", None) or language
    duration = getattr(response, "duration", None)

    return {
        "text": text.strip(),
        "language": detected_lang,
        "duration": duration,
    }


# ============================================================
# Voice settings (per-user preferences)
# ============================================================

DEFAULT_VOICE_SETTINGS = {
    "enabled": False,
    "language": "en-US",
    "voice_name": None,       # browser picks default
    "rate": 1.0,              # 0.5 to 2.0
    "pitch": 1.0,             # 0.0 to 2.0
    "volume": 1.0,            # 0.0 to 1.0
    "auto_speak": False,      # speak AI replies automatically
    "wake_word": None,        # e.g. "hey xentra"
    "wake_word_enabled": False,
}


def get_voice_settings(user) -> dict:
    """Return merged voice settings for a user."""
    stored = user.voice_settings or {}
    return {**DEFAULT_VOICE_SETTINGS, **stored}


def update_voice_settings(user, updates: dict) -> dict:
    """Merge new settings with existing ones and return the result."""
    current = get_voice_settings(user)
    merged = {**current, **updates}
    user.voice_settings = merged
    return merged