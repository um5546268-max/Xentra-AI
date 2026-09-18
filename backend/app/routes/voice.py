from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_permission
from app.models.user import User
from app.schemas.voice import (
    TranscriptResponse,
    VoiceSettings,
    VoiceSettingsUpdate,
)
from app.services.voice import (
    transcribe_audio,
    get_voice_settings,
    update_voice_settings,
)
from app.services.audit import log_quick


router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/transcribe", response_model=TranscriptResponse)
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
    prompt: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("voice.listen")),
):
    """
    Transcribe an uploaded audio file via Groq Whisper.
    Used as fallback for browsers that don't support Web Speech API.
    """
    # Sanitize — Swagger UI sometimes submits literal "string" as default
    if language and language.strip().lower() in ("", "string", "null", "none", "undefined"):
        language = None
    if prompt and prompt.strip().lower() in ("", "string", "null", "none", "undefined"):
        prompt = None
    if language:
        language = language.strip().lower()

    audio_bytes = await file.read()

    result = transcribe_audio(
        audio_bytes=audio_bytes,
        filename=file.filename or "audio.webm",
        language=language,
        prompt=prompt,
    )
    ...

    log_quick(
        db, current_user.id,
        action="voice.transcribe",
        summary=f"Transcribed {len(result['text'])} chars",
        payload={
            "filename": file.filename,
            "bytes": len(audio_bytes),
            "language": result.get("language"),
        },
    )

    return TranscriptResponse(**result)


@router.get("/settings", response_model=VoiceSettings)
def get_settings(
    current_user: User = Depends(get_current_user),
):
    """Get the current user's voice settings."""
    return VoiceSettings(**get_voice_settings(current_user))


@router.patch("/settings", response_model=VoiceSettings)
def update_settings(
    payload: VoiceSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update voice settings."""
    updates = payload.model_dump(exclude_unset=True)
    merged = update_voice_settings(current_user, updates)
    db.commit()
    db.refresh(current_user)

    log_quick(
        db, current_user.id,
        action="voice.settings_update",
        summary=f"Updated {len(updates)} voice setting(s)",
    )

    return VoiceSettings(**merged)