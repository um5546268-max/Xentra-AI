import uuid
from datetime import datetime
from pydantic import BaseModel


class FileRead(BaseModel):
    id: uuid.UUID
    original_name: str
    mime_type: str | None
    extension: str | None
    size_bytes: int
    status: str
    conversation_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FileDetail(FileRead):
    extracted_meta: dict | None = None
    has_text: bool = False


class FileListResponse(BaseModel):
    count: int
    files: list[FileRead]


class FileAttachRequest(BaseModel):
    conversation_id: uuid.UUID