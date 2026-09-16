import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(min_length=2, max_length=1000)
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=1024, ge=256, le=2048)
    model: str = Field(default="flux", max_length=50)
    seed: int | None = None
    conversation_id: uuid.UUID | None = None


class ImageRead(BaseModel):
    id: uuid.UUID
    prompt: str
    enhanced_prompt: str | None
    provider: str
    model: str
    width: int
    height: int
    seed: int | None
    image_url: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ImageListResponse(BaseModel):
    count: int
    images: list[ImageRead]