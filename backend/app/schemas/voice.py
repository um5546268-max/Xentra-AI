from pydantic import BaseModel, Field


class TranscriptResponse(BaseModel):
    text: str
    language: str | None = None
    duration: float | None = None


class VoiceSettings(BaseModel):
    enabled: bool = False
    language: str = "en-US"
    voice_name: str | None = None
    rate: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, ge=0.0, le=2.0)
    volume: float = Field(default=1.0, ge=0.0, le=1.0)
    auto_speak: bool = False
    wake_word: str | None = None
    wake_word_enabled: bool = False


class VoiceSettingsUpdate(BaseModel):
    enabled: bool | None = None
    language: str | None = None
    voice_name: str | None = None
    rate: float | None = Field(default=None, ge=0.5, le=2.0)
    pitch: float | None = Field(default=None, ge=0.0, le=2.0)
    volume: float | None = Field(default=None, ge=0.0, le=1.0)
    auto_speak: bool | None = None
    wake_word: str | None = None
    wake_word_enabled: bool | None = None